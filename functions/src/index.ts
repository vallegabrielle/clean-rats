import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentUpdated, onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as https from "https";

admin.initializeApp();

const db = admin.firestore();
const MAX_HOUSES = 2;
const MAX_NAME_LENGTH = 50;

function sanitizeName(raw: string): string {
    return raw
        .trim()
        .replace(/\s+/g, " ")
        .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF\u2028\u2029]/g, "")
        .slice(0, MAX_NAME_LENGTH)
        .trim();
}

// ── Rate limiter ──────────────────────────────────────────────────────────────
// 10 tentativas por usuário por hora, janela fixa reiniciada a cada hora.
// Os dados ficam em /rateLimits/{key} — inacessíveis pelo cliente
// (a coleção não tem regra allow no firestore.rules).
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hora

async function assertRateLimit(key: string): Promise<void> {
    const ref = db.collection("rateLimits").doc(key);

    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const now = Date.now();

        if (!snap.exists) {
            tx.set(ref, { attempts: 1, windowStart: now });
            return;
        }

        const { attempts, windowStart } = snap.data() as {
            attempts: number;
            windowStart: number;
        };

        if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
            tx.set(ref, { attempts: 1, windowStart: now });
            return;
        }

        if (attempts >= RATE_LIMIT_MAX) {
            throw new HttpsError(
                "resource-exhausted",
                "Muitas tentativas. Aguarde 1 hora e tente novamente.",
            );
        }

        tx.update(ref, { attempts: attempts + 1 });
    });
}

// ── Expo Push helper ──────────────────────────────────────────────────────────

interface PushMessage {
    to: string;
    title: string;
    body: string;
    sound?: "default";
}

async function sendExpoPush(messages: PushMessage[]): Promise<void> {
    if (messages.length === 0) return;

    const payload = JSON.stringify(messages);

    return new Promise((resolve, reject) => {
        const req = https.request(
            {
                hostname: "exp.host",
                path: "/--/api/v2/push/send",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            },
            (res) => {
                let body = "";
                res.on("data", (chunk: string) => { body += chunk; });
                res.on("end", async () => {
                    try {
                        const result = JSON.parse(body) as {
                            data: Array<{ status: string; details?: { error?: string } }>;
                        };
                        const staleTokens = messages
                            .filter((_, i) => {
                                const err = result.data?.[i]?.details?.error;
                                return err === "DeviceNotRegistered" || err === "InvalidCredentials";
                            })
                            .map((m) => m.to);
                        if (staleTokens.length > 0) {
                            const usersSnap = await db
                                .collection("users")
                                .where("pushToken", "in", staleTokens.slice(0, 10))
                                .get();
                            const batch = db.batch();
                            for (const userDoc of usersSnap.docs) {
                                batch.update(userDoc.ref, {
                                    pushToken: admin.firestore.FieldValue.delete(),
                                });
                            }
                            await batch.commit();
                        }
                    } catch {
                        // Não bloqueia: push foi enviado, limpeza é best-effort
                    }
                    resolve();
                });
            },
        );
        req.on("error", reject);
        req.write(payload);
        req.end();
    });
}

async function getTokensForUsers(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const snaps = await Promise.all(
        userIds.map((id) => db.collection("users").doc(id).get()),
    );
    return snaps
        .map((s) => (s.data() as { pushToken?: string } | undefined)?.pushToken)
        .filter((t): t is string => !!t && t.startsWith("ExponentPushToken"));
}

// ─────────────────────────────────────────────────────────────────────────────

export const joinHouseByCode = onCall({
    maxInstances: 5,
    memory: "128MiB",
    timeoutSeconds: 30,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Não autenticado.");
    }

    const data = request.data as { code?: unknown };
    if (!data.code || typeof data.code !== "string") {
        throw new HttpsError("invalid-argument", "Código inválido.");
    }

    const userId = request.auth.uid;
    const userName = sanitizeName(
        (request.auth.token["name"] as string | undefined) ?? "Usuário",
    );
    const normalizedCode = data.code.toUpperCase().trim();

    // Rate limit: 10 tentativas por hora por usuário
    await assertRateLimit(`joinHouse:${userId}`);

    // Busca toca pelo código
    const snapshot = await db
        .collection("houses")
        .where("code", "==", normalizedCode)
        .limit(1)
        .get();

    if (snapshot.empty) {
        return { success: false, error: "Código não encontrado." };
    }

    const houseDoc = snapshot.docs[0];
    const house = houseDoc.data();

    if ((house["memberIds"] ?? []).includes(userId)) {
        return { success: false, error: "Você já faz parte desta toca." };
    }

    if ((house["pendingMemberIds"] ?? []).includes(userId)) {
        return {
            success: false,
            error: "Você já enviou uma solicitação para esta toca.",
        };
    }

    // Verifica limite de tocas do lado do servidor (não confiar no cliente)
    const userHousesSnap = await db
        .collection("houses")
        .where("memberIds", "array-contains", userId)
        .get();

    if (userHousesSnap.size >= MAX_HOUSES) {
        return {
            success: false,
            error: `Limite de ${MAX_HOUSES} tocas atingido.`,
        };
    }

    // Adiciona solicitação de entrada
    await houseDoc.ref.update({
        pendingRequests: admin.firestore.FieldValue.arrayUnion({
            userId,
            name: userName,
            requestedAt: new Date().toISOString(),
        }),
        pendingMemberIds: admin.firestore.FieldValue.arrayUnion(userId),
    });

    return { success: true, pending: true };
});

// ── Trigger: house atualizada ─────────────────────────────────────────────────

export const onHouseUpdated = onDocumentUpdated({
    document: "houses/{houseId}",
    maxInstances: 3,
    memory: "128MiB",
    timeoutSeconds: 30,
}, async (event) => {
    const before = event.data?.before.data() as Record<string, unknown> | undefined;
    const after = event.data?.after.data() as Record<string, unknown> | undefined;
    if (!before || !after) return;

    const houseName = (after["name"] as string) ?? "toca";
    const memberIds = (after["memberIds"] as string[]) ?? [];

    // ── 1. Pedido de entrada ─────────────────────────────────────────────────
    const pendingBefore = (before["pendingMemberIds"] as string[]) ?? [];
    const pendingAfter = (after["pendingMemberIds"] as string[]) ?? [];
    const newRequests = pendingAfter.filter((id) => !pendingBefore.includes(id));

    if (newRequests.length > 0) {
        const pendingRequests = (after["pendingRequests"] as { userId: string; name: string }[]) ?? [];
        const tokens = await getTokensForUsers(memberIds);
        const messages: PushMessage[] = [];

        for (const userId of newRequests) {
            const req = pendingRequests.find((r) => r.userId === userId);
            const name = req?.name ?? "Alguém";
            for (const token of tokens) {
                messages.push({
                    to: token,
                    title: "Nova solicitação 🐀",
                    body: `${name} quer entrar em "${houseName}"`,
                    sound: "default",
                });
            }
        }

        await sendExpoPush(messages);
    }

    // ── 2. Aprovação / Rejeição ──────────────────────────────────────────────
    const membersBefore = (before["memberIds"] as string[]) ?? [];
    const membersAfter = (after["memberIds"] as string[]) ?? [];
    const removedFromPending = pendingBefore.filter((id) => !pendingAfter.includes(id));

    for (const userId of removedFromPending) {
        const wasApproved = membersAfter.includes(userId) && !membersBefore.includes(userId);
        const tokens = await getTokensForUsers([userId]);
        if (tokens.length === 0) continue;

        try {
            await sendExpoPush([{
                to: tokens[0],
                title: wasApproved ? "Solicitação aceita ✅" : "Solicitação recusada",
                body: wasApproved
                    ? `Você entrou em "${houseName}"! 🐀`
                    : `Sua solicitação para "${houseName}" foi recusada.`,
                sound: "default",
            }]);
        } catch (e) {
            console.error("[onHouseUpdated] sendExpoPush failed for userId", userId, e);
        }
    }

    // ── 3. Fim de período ────────────────────────────────────────────────────
    const periodBefore = before["periodStart"] as string | undefined;
    const periodAfter = after["periodStart"] as string | undefined;

    if (periodBefore && periodAfter && periodBefore !== periodAfter) {
        const history = (after["history"] as { scores: { memberName: string; points: number }[]; periodStart: string }[]) ?? [];
        const lastRecord = history[history.length - 1];

        if (lastRecord?.scores?.length > 0) {
            const sorted = [...lastRecord.scores].sort((a, b) => b.points - a.points);
            const topPoints = sorted[0].points;
            const winners = sorted.filter((s) => s.points === topPoints);
            const winnerLabel = winners.map((w) => w.memberName).join(" & ");
            const body = topPoints === 0
                ? `Período encerrado em "${houseName}" sem pontuação.`
                : `${winnerLabel} venceu${winners.length > 1 ? "m" : ""} com ${topPoints} pts! 🏆`;

            const tokens = await getTokensForUsers(memberIds);
            await sendExpoPush(tokens.map((token) => ({
                to: token,
                title: "Período encerrado! 🏆",
                body,
                sound: "default" as const,
            })));
        }
    }
});

// ── Trigger: tarefa registrada ────────────────────────────────────────────────

export const onLogCreated = onDocumentCreated({
    document: "houses/{houseId}/logs/{logId}",
    maxInstances: 3,
    memory: "128MiB",
    timeoutSeconds: 30,
}, async (event) => {
    const log = event.data?.data() as { memberId: string; taskId: string } | undefined;
    if (!log) return;

    const houseId = event.params.houseId;
    const houseSnap = await db.collection("houses").doc(houseId).get();
    if (!houseSnap.exists) return;

    const house = houseSnap.data() as {
        name: string;
        memberIds: string[];
        members: { id: string; name: string }[];
        tasks: { id: string; name: string; points: number }[];
    };

    const member = house.members.find((m) => m.id === log.memberId);
    const task = house.tasks.find((t) => t.id === log.taskId);
    if (!member || !task) return;

    // ── 1. Notificação de conclusão de tarefa (existente) ─────────────────────
    const otherMemberIds = house.memberIds.filter((id) => id !== log.memberId);
    const tokens = await getTokensForUsers(otherMemberIds);

    await sendExpoPush(tokens.map((token) => ({
        to: token,
        title: house.name,
        body: `${member.name} completou "${task.name}" (+${task.points} pts) ✅`,
        sound: "default" as const,
    })));

    // ── 2. Rivalry: notifica quem foi ultrapassado ────────────────────────────
    if (house.memberIds.length < 2) return;

    const logsSnap = await db
        .collection("houses").doc(houseId)
        .collection("logs").get();

    // Pontuação atual de cada membro (inclui o novo log)
    const pointsMap: Record<string, number> = {};
    for (const logDoc of logsSnap.docs) {
        const l = logDoc.data() as { memberId: string; taskId: string };
        const t = house.tasks.find((t) => t.id === l.taskId);
        if (!t) continue;
        pointsMap[l.memberId] = (pointsMap[l.memberId] ?? 0) + t.points;
    }

    const loggerAfter = pointsMap[log.memberId] ?? 0;
    const loggerBefore = loggerAfter - task.points;

    // Membros que estavam na frente ou empatados antes e agora estão atrás
    const overtakenIds = otherMemberIds.filter((id) => {
        const theirPoints = pointsMap[id] ?? 0;
        return theirPoints >= loggerBefore && loggerAfter > theirPoints;
    });

    if (overtakenIds.length === 0) return;

    // Mensagem personalizada por destinatário (pontuação específica de cada um)
    const rivalMessages: PushMessage[] = [];
    for (const rivalId of overtakenIds) {
        const rivalTokens = await getTokensForUsers([rivalId]);
        const theirPoints = pointsMap[rivalId] ?? 0;
        for (const token of rivalTokens) {
            rivalMessages.push({
                to: token,
                title: house.name,
                body: `${member.name} te ultrapassou! 🔥 ${loggerAfter} vs ${theirPoints} pts`,
                sound: "default" as const,
            });
        }
    }

    await sendExpoPush(rivalMessages);
});

// ── Scheduled: notifica membros inativos ──────────────────────────────────────

const STALE_THRESHOLDS: Record<string, number> = {
    weekly: 2,
    biweekly: 4,
    monthly: 7,
};

export const notifyStaleMembers = onSchedule({
    schedule: "0 14 * * *",  // diariamente, 11h BRT (UTC-3)
    timeoutSeconds: 120,
    memory: "256MiB",
}, async () => {
    const now = Date.now();
    const housesSnap = await db.collection("houses").get();

    for (const houseDoc of housesSnap.docs) {
        const house = houseDoc.data() as {
            name: string;
            period: string;
            periodStart?: string;
            memberIds: string[];
        };

        if (!house.periodStart || house.memberIds.length === 0) continue;

        const thresholdMs = (STALE_THRESHOLDS[house.period] ?? 3) * 24 * 60 * 60 * 1000;
        const periodStart = new Date(house.periodStart).getTime();

        // Logs do período atual
        const logsSnap = await db
            .collection("houses").doc(houseDoc.id)
            .collection("logs")
            .where("completedAt", ">=", house.periodStart)
            .get();

        // Último log por membro no período atual
        const lastLogByMember: Record<string, number> = {};
        for (const logDoc of logsSnap.docs) {
            const { memberId, completedAt } = logDoc.data() as {
                memberId: string;
                completedAt: string;
            };
            const ts = new Date(completedAt).getTime();
            if (!lastLogByMember[memberId] || ts > lastLogByMember[memberId]) {
                lastLogByMember[memberId] = ts;
            }
        }

        // Membros sem atividade além do threshold
        const staleIds = house.memberIds.filter((id) => {
            const last = lastLogByMember[id] ?? periodStart;
            return now - last > thresholdMs;
        });

        if (staleIds.length === 0) continue;

        const messages: PushMessage[] = [];
        for (const memberId of staleIds) {
            const memberTokens = await getTokensForUsers([memberId]);
            for (const token of memberTokens) {
                messages.push({
                    to: token,
                    title: house.name,
                    body: "A casa tá suja! 🧹 Que tal registrar uma tarefa?",
                    sound: "default" as const,
                });
            }
        }

        await sendExpoPush(messages);
    }
});

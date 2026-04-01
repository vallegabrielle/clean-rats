import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
const MAX_HOUSES = 5;
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

// ─────────────────────────────────────────────────────────────────────────────

export const joinHouseByCode = onCall(async (request) => {
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

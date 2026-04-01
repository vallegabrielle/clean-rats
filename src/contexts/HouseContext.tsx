import { useEffect } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    updateDoc,
    runTransaction,
    onSnapshot,
    query,
    where,
    arrayUnion,
    getDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../services/firebase";
import { House, Member, Period } from "../types";
import {
    checkAndResetPeriod,
    computePeriodScores,
    getCurrentPeriodStart,
} from "../services/period";
import {
    loadActiveHouseId,
    saveActiveHouseId,
    clearAllData,
} from "../services/storage";
import {
    addTask,
    removeTask,
    updateTask,
    logTask,
    removeLog,
    updateLog,
} from "../services/house";
import { useAuthStore } from "./AuthContext";
import { showToast } from "../components/Toast";

export const MAX_HOUSES = 5;

interface HouseState {
    houses: House[];
    pendingHouses: House[];
    activeHouseId: string | null;
    loadingHouses: boolean;
    subscribe: (userId: string) => () => void;
    reset: () => void;
    setActiveHouseId: (id: string) => Promise<void>;
    addHouseToList: (house: House) => Promise<void>;
    removeHouseFromList: (id: string) => Promise<void>;
    joinHouseByCode: (
        code: string,
    ) => Promise<{ success: boolean; pending?: boolean; error?: string }>;
    approveJoinRequest: (
        houseId: string,
        requestUserId: string,
    ) => Promise<void>;
    rejectJoinRequest: (
        houseId: string,
        requestUserId: string,
    ) => Promise<void>;
    removeAllData: () => Promise<void>;
    addTaskToHouse: (name: string, points: number) => Promise<void>;
    removeTaskFromHouse: (taskId: string) => Promise<void>;
    updateTaskInHouse: (
        taskId: string,
        name: string,
        points: number,
    ) => Promise<void>;
    logTaskInHouse: (taskId: string) => Promise<void>;
    removeLogFromHouse: (logId: string) => Promise<void>;
    updateLogInHouse: (logId: string, taskId: string) => Promise<void>;
    addTaskAndLogInHouse: (name: string, points: number) => Promise<void>;
    renameHouse: (name: string) => Promise<void>;
    updateHousePrize: (prize: string) => Promise<void>;
    updateHousePeriod: (period: Period) => Promise<void>;
    leaveHouse: (id: string) => Promise<void>;
    renameCurrentUserInHouses: (name: string) => Promise<void>;
    seedMockData: () => Promise<void>;
}

export const useHouseStore = create<HouseState>()((set, get) => {
    // ─── Internal helpers ──────────────────────────────────────────────────────

    function getActive(): House | null {
        const { houses, activeHouseId } = get();
        return houses.find((h) => h.id === activeHouseId) ?? null;
    }

    async function updateHouseFields(id: string, fields: Partial<House>) {
        const prev = get().houses;
        set((s) => ({
            houses: s.houses.map((h) =>
                h.id === id ? { ...h, ...fields } : h,
            ),
        }));
        try {
            await updateDoc(
                doc(db, "houses", id),
                fields as Record<string, unknown>,
            );
        } catch (e: any) {
            set({ houses: prev });
            const offline =
                e?.code === "unavailable" ||
                e?.message?.toLowerCase().includes("offline") ||
                e?.message?.toLowerCase().includes("network");
            showToast(
                offline
                    ? "Sem conexão. A ação não foi salva."
                    : `Erro ao salvar. Tente novamente.`,
            );
            throw e;
        }
    }

    async function withActive(fn: (house: House) => Partial<House>): Promise<void> {
        const h = getActive();
        if (!h) return;
        try {
            await updateHouseFields(h.id, fn(h));
        } catch {
            // toast + rollback already handled in updateHouseFields
        }
    }

    async function redirectActiveAway(removedId: string) {
        const { activeHouseId, houses } = get();
        if (activeHouseId !== removedId) return;
        const newActive = houses.find((h) => h.id !== removedId)?.id ?? null;
        set({ activeHouseId: newActive });
        await saveActiveHouseId(newActive);
    }

    // ─── Store ─────────────────────────────────────────────────────────────────

    return {
        houses: [],
        pendingHouses: [],
        activeHouseId: null,
        loadingHouses: true,

        subscribe: (userId) => {
            let firstLoad = true;
            let prevHouses: House[] = [];
            // shared between both listeners to detect approval
            const pendingHouseNames = new Map<string, string>();

            set({ loadingHouses: true });

            // Listener 1: tocas onde o usuário é membro pleno
            const memberQ = query(
                collection(db, "houses"),
                where("memberIds", "array-contains", userId),
            );
            const unsubMember = onSnapshot(
                memberQ,
                async (snapshot) => {
                    try {
                        const loaded: House[] = [];
                        for (const d of snapshot.docs) {
                            const house = d.data() as House;
                            const result = checkAndResetPeriod(house);
                            if (result.type === "reset") {
                                // Use a transaction to re-read the document and
                                // only write if the period is still expired.
                                // This prevents multiple clients from racing to
                                // reset the same period simultaneously.
                                const ref = doc(db, "houses", house.id);
                                await runTransaction(db, async (tx) => {
                                    const snap = await tx.get(ref);
                                    if (!snap.exists()) return;
                                    const fresh = snap.data() as House;
                                    const freshResult = checkAndResetPeriod(fresh);
                                    if (freshResult.type !== "reset") return;
                                    tx.update(ref, {
                                        logs: freshResult.house.logs,
                                        periodStart: freshResult.house.periodStart,
                                        history: freshResult.house.history,
                                    });
                                });
                                loaded.push(result.house);
                            } else if (result.type === "init") {
                                loaded.push(result.house);
                            } else {
                                loaded.push(house);
                            }
                        }

                        if (!firstLoad) {
                            for (const house of loaded) {
                                const prev = prevHouses.find(
                                    (h) => h.id === house.id,
                                );
                                if (prev) {
                                    const newMembers = house.members.filter(
                                        (m) =>
                                            m.id !== userId &&
                                            !prev.members.some(
                                                (pm) => pm.id === m.id,
                                            ),
                                    );
                                    for (const m of newMembers) {
                                        showToast(
                                            `${m.name} entrou em "${house.name}"! 🐀`,
                                            "success",
                                        );
                                    }
                                } else if (pendingHouseNames.has(house.id)) {
                                    // era pendente, agora é membro
                                    showToast(
                                        `Você foi aceito em "${house.name}"! 🐀`,
                                        "success",
                                    );
                                }
                            }
                        }

                        prevHouses = loaded;
                        set({ houses: loaded });

                        if (firstLoad) {
                            firstLoad = false;
                            const savedId = await loadActiveHouseId();
                            const valid = loaded.find((h) => h.id === savedId);
                            set({
                                activeHouseId:
                                    valid?.id ?? loaded[0]?.id ?? null,
                                loadingHouses: false,
                            });
                        } else {
                            set((s) => ({
                                activeHouseId: loaded.some(
                                    (h) => h.id === s.activeHouseId,
                                )
                                    ? s.activeHouseId
                                    : (loaded[0]?.id ?? null),
                            }));
                        }
                    } catch (e) {
                        console.error(
                            "[onSnapshot] error processing houses:",
                            e,
                        );
                        set({ loadingHouses: false });
                    }
                },
                () => set({ loadingHouses: false }),
            );

            // Listener 2: tocas com solicitação pendente do usuário
            const pendingQ = query(
                collection(db, "houses"),
                where("pendingMemberIds", "array-contains", userId),
            );
            const unsubPending = onSnapshot(pendingQ, (snapshot) => {
                const loaded = snapshot.docs.map((d) => d.data() as House);
                pendingHouseNames.clear();
                for (const h of loaded) pendingHouseNames.set(h.id, h.name);
                set({ pendingHouses: loaded });
            });

            return () => {
                unsubMember();
                unsubPending();
            };
        },

        reset: () =>
            set({
                houses: [],
                pendingHouses: [],
                activeHouseId: null,
                loadingHouses: false,
            }),

        setActiveHouseId: async (id) => {
            set({ activeHouseId: id });
            await saveActiveHouseId(id);
        },

        addHouseToList: async (house) => {
            try {
                await setDoc(doc(db, "houses", house.id), house);
            } catch (e: any) {
                const offline = e?.code === "unavailable" || e?.message?.toLowerCase().includes("offline");
                throw new Error(offline ? "Sem conexão. Não foi possível criar a toca." : "Erro ao criar a toca. Tente novamente.");
            }
            set({ activeHouseId: house.id });
            await saveActiveHouseId(house.id);
        },

        removeHouseFromList: async (id) => {
            try {
                await deleteDoc(doc(db, "houses", id));
            } catch (e: any) {
                const offline = e?.code === "unavailable" || e?.message?.toLowerCase().includes("offline");
                throw new Error(offline ? "Sem conexão. Não foi possível remover a toca." : "Erro ao remover a toca. Tente novamente.");
            }
            await redirectActiveAway(id);
        },

        joinHouseByCode: async (code) => {
            const user = useAuthStore.getState().user;
            if (!user) return { success: false, error: "Não autenticado." };

            try {
                const fn = httpsCallable<
                    { code: string },
                    { success: boolean; pending?: boolean; error?: string }
                >(functions, "joinHouseByCode");
                const result = await fn({ code: code.trim().toUpperCase() });
                return result.data;
            } catch (e: any) {
                console.error("[joinHouseByCode]", e);
                const offline =
                    e?.code === "unavailable" ||
                    e?.message?.toLowerCase().includes("offline") ||
                    e?.message?.toLowerCase().includes("network");
                return {
                    success: false,
                    error: offline
                        ? "Sem conexão. Não foi possível entrar na toca."
                        : "Erro ao entrar na toca. Tente novamente.",
                };
            }
        },

        approveJoinRequest: async (houseId, requestUserId) => {
            const houseRef = doc(db, "houses", houseId);
            const snap = await getDoc(houseRef);
            if (!snap.exists()) return;
            const house = snap.data() as House;

            const request = (house.pendingRequests ?? []).find(
                (r) => r.userId === requestUserId,
            );
            if (!request) return;

            const newMember: Member = {
                id: request.userId,
                name: request.name,
            };
            await updateDoc(houseRef, {
                members: arrayUnion(newMember),
                memberIds: arrayUnion(requestUserId),
                pendingRequests: (house.pendingRequests ?? []).filter(
                    (r) => r.userId !== requestUserId,
                ),
                pendingMemberIds: (house.pendingMemberIds ?? []).filter(
                    (id) => id !== requestUserId,
                ),
            });
        },

        rejectJoinRequest: async (houseId, requestUserId) => {
            const houseRef = doc(db, "houses", houseId);
            const snap = await getDoc(houseRef);
            if (!snap.exists()) return;
            const house = snap.data() as House;

            await updateDoc(houseRef, {
                pendingRequests: (house.pendingRequests ?? []).filter(
                    (r) => r.userId !== requestUserId,
                ),
                pendingMemberIds: (house.pendingMemberIds ?? []).filter(
                    (id) => id !== requestUserId,
                ),
            });
        },

        removeAllData: async () => {
            set({ houses: [], activeHouseId: null });
            await clearAllData();
        },

        addTaskToHouse: (name, points) =>
            withActive((h) => ({
                tasks: addTask(h, name, points).house.tasks,
            })),

        removeTaskFromHouse: (taskId) =>
            withActive((h) => ({
                tasks: removeTask(h, taskId).tasks,
                logs: h.logs.filter((l) => l.taskId !== taskId),
            })),

        updateTaskInHouse: (taskId, name, points) =>
            withActive((h) => ({
                tasks: updateTask(h, taskId, name, points).tasks,
            })),

        logTaskInHouse: (taskId) => {
            const uid = useAuthStore.getState().user?.uid;
            if (!uid) return Promise.resolve();
            return withActive((h) => ({ logs: logTask(h, taskId, uid).logs }));
        },

        removeLogFromHouse: (logId) =>
            withActive((h) => ({ logs: removeLog(h, logId).logs })),

        updateLogInHouse: (logId, taskId) =>
            withActive((h) => ({ logs: updateLog(h, logId, taskId).logs })),

        renameHouse: (name) => withActive(() => ({ name })),

        updateHousePrize: (prize) => withActive(() => ({ prize })),

        updateHousePeriod: (period) =>
            withActive((h) => {
                const newPeriodStart =
                    getCurrentPeriodStart(period).toISOString();
                let history = h.history ?? [];
                if (h.logs.length > 0) {
                    const alreadyArchived = history.some(
                        (r) => r.periodStart === h.periodStart,
                    );
                    if (!alreadyArchived) {
                        const scores = computePeriodScores(h);
                        history = [
                            ...history,
                            {
                                periodStart: h.periodStart,
                                periodEnd: new Date().toISOString(),
                                scores,
                            },
                        ];
                    }
                }
                return {
                    period,
                    periodStart: newPeriodStart,
                    logs: [],
                    history,
                };
            }),

        addTaskAndLogInHouse: (name, points) => {
            const uid = useAuthStore.getState().user?.uid;
            if (!uid) return Promise.resolve();
            return withActive((h) => {
                const { house: houseWithTask, task: newTask } = addTask(h, name, points);
                const houseWithLog = logTask(houseWithTask, newTask.id, uid);
                return { tasks: houseWithLog.tasks, logs: houseWithLog.logs };
            });
        },

        leaveHouse: async (id) => {
            const user = useAuthStore.getState().user;
            if (!user) return;

            try {
                const houseRef = doc(db, "houses", id);
                const snapshot = await getDoc(houseRef);
                if (!snapshot.exists()) return;

                const data = snapshot.data() as House;
                const memberIds: string[] = data.memberIds ?? [];

                if (memberIds.length <= 1) {
                    await deleteDoc(houseRef);
                } else {
                    await updateDoc(houseRef, {
                        memberIds: memberIds.filter((uid) => uid !== user.uid),
                        members: data.members.filter((m) => m.id !== user.uid),
                    });
                }
            } catch (e: any) {
                console.error("[leaveHouse] error:", e);
                const offline = e?.code === "unavailable" || e?.message?.toLowerCase().includes("offline");
                throw new Error(offline ? "Sem conexão. Não foi possível sair da toca." : "Erro ao sair da toca. Tente novamente.");
            }

            await redirectActiveAway(id);
        },

        renameCurrentUserInHouses: async (name) => {
            const user = useAuthStore.getState().user;
            if (!user) return;
            const { houses } = get();
            await Promise.all(
                houses
                    .filter((h) => h.members.some((m) => m.id === user.uid))
                    .map((house) =>
                        updateDoc(doc(db, "houses", house.id), {
                            members: house.members.map((m) =>
                                m.id === user.uid ? { ...m, name } : m,
                            ),
                        }),
                    ),
            );
        },

        seedMockData: async () => {
            const h = getActive();
            if (!h) return;

            const mockMembers: Member[] = [
                { id: "mock-001-ana", name: "Ana Silva" },
                { id: "mock-002-bru", name: "Bruno Costa" },
                { id: "mock-003-car", name: "Carol Lima" },
            ];
            const mockMemberIds = new Set(mockMembers.map((m) => m.id));

            const cleanMembers = h.members.filter(
                (m) => !mockMemberIds.has(m.id),
            );
            const cleanMemberIds = h.memberIds.filter(
                (id) => !mockMemberIds.has(id),
            );
            const cleanLogs = h.logs.filter((l) => !l.id.startsWith("mock-"));
            const allMembers = [...cleanMembers, ...mockMembers];
            const allMemberIds = [
                ...cleanMemberIds,
                ...mockMembers.map((m) => m.id),
            ];

            const tasks = h.tasks;
            if (tasks.length === 0) return;
            const now = new Date();
            const newLogs = [];
            for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
                for (const member of allMembers) {
                    const count = Math.floor(Math.random() * 3) + 1;
                    for (let i = 0; i < count; i++) {
                        const task =
                            tasks[Math.floor(Math.random() * tasks.length)];
                        const d = new Date(now);
                        d.setDate(d.getDate() - daysAgo);
                        d.setHours(
                            7 + Math.floor(Math.random() * 14),
                            Math.floor(Math.random() * 60),
                        );
                        newLogs.push({
                            id: `mock-${daysAgo}-${member.id}-${i}-${Math.random().toString(36).slice(2, 7)}`,
                            taskId: task.id,
                            memberId: member.id,
                            completedAt: d.toISOString(),
                        });
                    }
                }
            }

            try {
                await updateHouseFields(h.id, {
                    members: allMembers,
                    memberIds: allMemberIds,
                    logs: [...cleanLogs, ...newLogs],
                });
                showToast(
                    `Mock reinserido: ${mockMembers.length} membros e ${newLogs.length} atividades!`,
                    "success",
                );
            } catch (e: any) {
                showToast(
                    `Erro ao inserir mock: ${e?.code ?? e?.message ?? "desconhecido"}`,
                );
            }
        },
    };
});

// ─── Public API ────────────────────────────────────────────────────────────────

export const selectActiveHouse = (s: HouseState) =>
    s.houses.find((h) => h.id === s.activeHouseId) ?? null;

export function useHouse() {
    return useHouseStore(
        useShallow((s) => ({
            houses: s.houses,
            pendingHouses: s.pendingHouses,
            activeHouse: s.houses.find((h) => h.id === s.activeHouseId) ?? null,
            loadingHouses: s.loadingHouses,
            setActiveHouseId: s.setActiveHouseId,
            addHouseToList: s.addHouseToList,
            removeHouseFromList: s.removeHouseFromList,
            joinHouseByCode: s.joinHouseByCode,
            approveJoinRequest: s.approveJoinRequest,
            rejectJoinRequest: s.rejectJoinRequest,
            removeAllData: s.removeAllData,
            addTaskToHouse: s.addTaskToHouse,
            removeTaskFromHouse: s.removeTaskFromHouse,
            updateTaskInHouse: s.updateTaskInHouse,
            logTaskInHouse: s.logTaskInHouse,
            removeLogFromHouse: s.removeLogFromHouse,
            updateLogInHouse: s.updateLogInHouse,
            addTaskAndLogInHouse: s.addTaskAndLogInHouse,
            renameHouse: s.renameHouse,
            updateHousePrize: s.updateHousePrize,
            updateHousePeriod: s.updateHousePeriod,
            leaveHouse: s.leaveHouse,
            renameCurrentUserInHouses: s.renameCurrentUserInHouses,
            seedMockData: s.seedMockData,
        })),
    );
}

/**
 * Mount once near the app root. Drives the Firestore subscription
 * reactively from auth state — replaces HouseProvider.
 */
export function HouseSync() {
    const userId = useAuthStore((s) => s.user?.uid ?? null);

    useEffect(() => {
        if (!userId) {
            useHouseStore.getState().reset();
            return;
        }
        return useHouseStore.getState().subscribe(userId);
    }, [userId]);

    return null;
}

/**
 * Testes de integração E2E do store (136–140)
 *
 * Fluxos multi-step sem render — chamadas ao store em sequência,
 * verificando consistência de estado e de operações no Firestore.
 */

import * as Crypto from 'expo-crypto';
import {
    getDocs,
    getDoc,
    updateDoc,
    setDoc,
    deleteDoc,
    runTransaction,
    onSnapshot,
    where,
    writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useHouseStore } from '../HouseContext';
import { useAuthStore } from '../AuthContext';
import { loadActiveHouseId } from '../../services/storage';
import { computeScores } from '../../services/period';
import { House, JoinRequest, TaskLog } from '../../types';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('firebase/firestore', () => ({
    collection: jest.fn(() => ({})),
    doc: jest.fn(() => ({})),
    setDoc: jest.fn(() => Promise.resolve()),
    deleteDoc: jest.fn(() => Promise.resolve()),
    updateDoc: jest.fn(() => Promise.resolve()),
    runTransaction: jest.fn(() => Promise.resolve()),
    onSnapshot: jest.fn(() => jest.fn()),
    query: jest.fn(() => ({})),
    where: jest.fn(() => ({})),
    limit: jest.fn(() => ({})),
    getDocs: jest.fn(),
    getDoc: jest.fn(),
    arrayUnion: jest.fn((value) => value),
    writeBatch: jest.fn(() => ({
        delete: jest.fn(),
        set: jest.fn(),
        commit: jest.fn(() => Promise.resolve()),
    })),
    orderBy: jest.fn(() => ({})),
}));

jest.mock('firebase/functions', () => ({
    httpsCallable: jest.fn(() => jest.fn(() => Promise.resolve({ data: { success: true } }))),
}));

jest.mock('../../services/firebase', () => ({ db: {}, functions: {} }));

jest.mock('../AuthContext', () => ({
    useAuthStore: {
        getState: jest.fn(() => ({
            user: { uid: 'user-1', displayName: 'Alice' },
        })),
    },
}));

jest.mock('../../services/storage', () => ({
    loadActiveHouseId: jest.fn(() => Promise.resolve(null)),
    saveActiveHouseId: jest.fn(() => Promise.resolve()),
    clearAllData: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../components/Toast', () => ({
    showToast: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
    randomUUID: jest.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeHouse(overrides: Partial<House> = {}): House {
    return {
        id: 'house-1',
        name: 'Test House',
        code: 'ABC123',
        period: 'weekly',
        memberIds: ['owner-1'],
        members: [{ id: 'owner-1', name: 'Owner' }],
        tasks: [
            { id: 'task-1', name: 'Lavar louça', points: 10, isDefault: true },
        ],
        createdAt: '2024-01-01T00:00:00.000Z',
        periodStart: new Date().toISOString(), // período atual por padrão → sem reset
        history: [],
        pendingRequests: [],
        pendingMemberIds: [],
        ...overrides,
    };
}

function makeQuerySnap(houses: House[]) {
    return {
        empty: houses.length === 0,
        docs: houses.map((h) => ({ ref: {}, data: () => h, id: h.id })),
    };
}

function makeDocSnap(house: House | null) {
    return {
        exists: () => house !== null,
        data: () => house,
    };
}

/**
 * Captura o callback do primeiro onSnapshot (member houses) e retorna
 * uma função para dispará-lo manualmente, simulando um update do Firestore.
 */
function captureMemberSnapshot(): (snap: ReturnType<typeof makeQuerySnap>) => Promise<void> {
    let captured: ((snap: unknown) => Promise<void>) | null = null;
    jest.mocked(onSnapshot).mockImplementation((_: unknown, callback: unknown) => {
        if (!captured) captured = callback as typeof captured;
        return jest.fn();
    });
    return (snap) => {
        if (!captured) throw new Error('subscribe() não foi chamado ainda');
        return captured(snap);
    };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();

    let counter = 0;
    jest.mocked(Crypto.randomUUID).mockImplementation(
        () =>
            `${(++counter).toString(16).padStart(8, '0')}-0000-4000-8000-000000000000` as ReturnType<
                typeof Crypto.randomUUID
            >,
    );

    (useAuthStore.getState as jest.Mock).mockReturnValue({
        user: { uid: 'user-1', displayName: 'Alice' },
    });

    useHouseStore.setState({
        houses: [],
        pendingHouses: [],
        activeHouseId: null,
        loadingHouses: false,
        logs: [],
        logsLoading: false,
    });
});

// ─── 136 ─────────────────────────────────────────────────────────────────────

describe('136 — fluxo completo de join', () => {
    test('request → pendente no Firestore → aprovar → membro no Firestore', async () => {
        // ── Passo 1: user-2 solicita entrada diretamente no Firestore ─────────
        (useAuthStore.getState as jest.Mock).mockReturnValue({
            user: { uid: 'user-2', displayName: 'Bob' },
        });
        const house = makeHouse({ memberIds: ['owner-1'], pendingMemberIds: [] });
        jest.mocked(getDocs).mockResolvedValue(makeQuerySnap([house]) as any);

        const joinResult = await useHouseStore.getState().joinHouseByCode('XYZ99999');

        expect(joinResult).toEqual({ success: true, pending: true });
        expect(jest.mocked(where)).toHaveBeenCalledWith('code', '==', 'XYZ99999');

        // ── Passo 2: owner aprova ─────────────────────────────────────────────
        jest.clearAllMocks();

        const pendingRequest: JoinRequest = {
            userId: 'user-2',
            name: 'Bob',
            requestedAt: new Date().toISOString(),
        };
        const houseWithPending = makeHouse({
            pendingRequests: [pendingRequest],
            pendingMemberIds: ['user-2'],
        });
        jest.mocked(getDoc).mockResolvedValue(makeDocSnap(houseWithPending) as any);
        (useAuthStore.getState as jest.Mock).mockReturnValue({
            user: { uid: 'owner-1', displayName: 'Owner' },
        });

        await useHouseStore.getState().approveJoinRequest('house-1', 'user-2');

        const approvePayload = (jest.mocked(updateDoc).mock.calls[0] as unknown as [unknown, Record<string, unknown>])[1];
        // user-2 promovido a membro pleno
        expect(approvePayload.memberIds).toBe('user-2');
        expect((approvePayload.members as { id: string }).id).toBe('user-2');
        // fila de pendentes esvaziada
        expect(approvePayload.pendingMemberIds).toEqual([]);
        expect(approvePayload.pendingRequests).toEqual([]);
    });
});

// ─── 137 ─────────────────────────────────────────────────────────────────────

describe('137 — fluxo de reset de período', () => {
    test('logs no período → expirar → scores arquivados no history → logs zerados', async () => {
        const expiredHouse = makeHouse({
            // periodStart muito antigo → checkAndResetPeriod retorna 'reset'
            periodStart: '2020-01-01T00:00:00.000Z',
            history: [],
        });

        // Mock getDocs to return a log when queried for the subcollection
        const mockLog: TaskLog = { id: 'log-1', taskId: 'task-1', memberId: 'owner-1', completedAt: '2020-01-05T00:00:00.000Z' };
        jest.mocked(getDocs).mockResolvedValue({
            docs: [{ ref: {}, data: () => mockLog, id: mockLog.id }],
            empty: false,
        } as any);

        // writeBatch mock
        const mockBatch = { delete: jest.fn(), set: jest.fn(), commit: jest.fn(() => Promise.resolve()) };
        jest.mocked(writeBatch).mockReturnValue(mockBatch as any);

        // runTransaction must execute the callback and delegate tx.update → updateDoc
        jest.mocked(runTransaction).mockImplementation(async (_db, fn) => {
            const tx = {
                get: jest.fn(async () => makeDocSnap(expiredHouse)),
                update: jest.fn((...args: Parameters<typeof updateDoc>) =>
                    jest.mocked(updateDoc)(...args),
                ),
            };
            return fn(tx as any);
        });

        const fireSnapshot = captureMemberSnapshot();
        useHouseStore.getState().subscribe('owner-1');

        // Firestore "entrega" a casa com período vencido
        await fireSnapshot(makeQuerySnap([expiredHouse]));

        // Deve ter usado runTransaction (não setDoc direto)
        expect(jest.mocked(runTransaction)).toHaveBeenCalledTimes(1);
        expect(jest.mocked(updateDoc)).toHaveBeenCalledTimes(1);
        const fields = jest.mocked(updateDoc).mock.calls[0][1] as Partial<House>;

        // NO logs field in house doc update (logs live in subcollection)
        expect(fields).not.toHaveProperty('logs');

        // periodStart updated
        expect(fields.periodStart).toBeTruthy();

        // Período arquivado no history com scores corretos
        expect(fields.history).toHaveLength(1);
        expect(fields.history![0].periodStart).toBe('2020-01-01T00:00:00.000Z');
        expect(fields.history![0].scores).toHaveLength(1);
        expect(fields.history![0].scores[0].memberId).toBe('owner-1');
        expect(fields.history![0].scores[0].points).toBe(10);

        // Batch delete was called for the log
        expect(mockBatch.delete).toHaveBeenCalledTimes(1);
        expect(mockBatch.commit).toHaveBeenCalledTimes(1);

        // Store logs cleared
        expect(useHouseStore.getState().logs).toEqual([]);
    });

    test('outro cliente já resetou → transaction é no-op → store usa snapshot result como fallback', async () => {
        // Snapshot entregue pelo listener: período vencido
        const expiredHouse = makeHouse({
            periodStart: '2020-01-01T00:00:00.000Z',
            history: [],
        });

        // getDocs returns no logs
        jest.mocked(getDocs).mockResolvedValue({ docs: [], empty: true } as any);

        const mockBatch = { delete: jest.fn(), commit: jest.fn(() => Promise.resolve()) };
        jest.mocked(writeBatch).mockReturnValue(mockBatch as any);

        // Mas quando a transaction re-lê, o doc já foi atualizado por outro cliente
        const alreadyResetHouse = makeHouse({
            periodStart: new Date().toISOString(), // período atual → 'none'
            history: [
                {
                    periodStart: '2020-01-01T00:00:00.000Z',
                    periodEnd: new Date().toISOString(),
                    scores: [],
                },
            ],
        });

        jest.mocked(runTransaction).mockImplementation(async (_db, fn) => {
            const tx = {
                get: jest.fn(async () => makeDocSnap(alreadyResetHouse)),
                update: jest.fn(),
            };
            return fn(tx as any);
        });

        const fireSnapshot = captureMemberSnapshot();
        useHouseStore.getState().subscribe('owner-1');
        await fireSnapshot(makeQuerySnap([expiredHouse]));

        // Transaction foi chamada mas tx.update NÃO — período já estava ok no re-read
        expect(jest.mocked(runTransaction)).toHaveBeenCalledTimes(1);
        expect(jest.mocked(updateDoc)).not.toHaveBeenCalled();

        // Store deve usar o resultado do snapshot (fallback) — não crash
        const storeHouse = useHouseStore.getState().houses[0];
        expect(storeHouse).toBeDefined();
    });
});

// ─── 138 ─────────────────────────────────────────────────────────────────────

describe('138 — fluxo de tarefa deletada', () => {
    test('tarefa removida → logs dela removidos → pontuação recalculada corretamente', async () => {
        const house = makeHouse({
            tasks: [
                { id: 'task-1', name: 'A', points: 10, isDefault: true },
                { id: 'task-2', name: 'B', points: 20, isDefault: true },
            ],
        });
        const logsInStore: TaskLog[] = [
            {
                id: 'log-1',
                taskId: 'task-1',
                memberId: 'owner-1',
                completedAt: '2024-01-01T00:00:00.000Z',
            },
            {
                id: 'log-2',
                taskId: 'task-2',
                memberId: 'owner-1',
                completedAt: '2024-01-02T00:00:00.000Z',
            },
        ];

        // writeBatch mock
        const mockBatch = { delete: jest.fn(), set: jest.fn(), commit: jest.fn(() => Promise.resolve()) };
        jest.mocked(writeBatch).mockReturnValue(mockBatch as any);

        useHouseStore.setState({ houses: [house], activeHouseId: 'house-1', logs: logsInStore });

        // Antes da deleção: 10 + 20 = 30 pts
        const before = computeScores(useHouseStore.getState().houses[0], useHouseStore.getState().logs);
        expect(before[0].points).toBe(30);

        await useHouseStore.getState().removeTaskFromHouse('task-1');

        const afterHouse = useHouseStore.getState().houses[0];

        // Tarefa removida
        expect(afterHouse.tasks.find((t) => t.id === 'task-1')).toBeUndefined();
        expect(afterHouse.tasks).toHaveLength(1);

        // Store logs updated — log-1 (task-1) removed
        const afterLogs = useHouseStore.getState().logs;
        expect(afterLogs.find((l) => l.taskId === 'task-1')).toBeUndefined();
        expect(afterLogs).toHaveLength(1);

        // Pontuação recalculada: só task-2 → 20 pts
        const after = computeScores(afterHouse, afterLogs);
        expect(after[0].points).toBe(20);

        // Firestore recebeu tasks no house doc write
        const firestorePayload = (jest.mocked(updateDoc).mock.calls[0] as unknown as [unknown, { tasks: unknown[] }])[1];
        expect(firestorePayload.tasks).toHaveLength(1);

        // Batch delete called for the orphaned log
        expect(mockBatch.delete).toHaveBeenCalledTimes(1);
        expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });
});

// ─── 139 ─────────────────────────────────────────────────────────────────────

describe('139 — múltiplas casas', () => {
    test('trocar de casa ativa não contamina dados das outras', async () => {
        const house1 = makeHouse({ id: 'house-1', code: 'AAA111', memberIds: ['user-1'], members: [{ id: 'user-1', name: 'Alice' }] });
        const house2 = makeHouse({
            id: 'house-2',
            code: 'BBB222',
            tasks: [{ id: 'task-2', name: 'Outra tarefa', points: 50, isDefault: false }],
        });

        useHouseStore.setState({
            houses: [house1, house2],
            activeHouseId: 'house-1',
            logs: [],
        });

        // Operação na casa ativa (house-1)
        await useHouseStore.getState().logTaskInHouse('task-1');

        // Store logs contain the new log for house-1
        const logsAfterLog = useHouseStore.getState().logs;
        expect(logsAfterLog).toHaveLength(1);
        expect(logsAfterLog[0].taskId).toBe('task-1');

        // setDoc was called for the log in house-1
        expect(jest.mocked(setDoc)).toHaveBeenCalledTimes(1);

        jest.clearAllMocks();

        // Troca para house-2 e simula logs listener entregando logs da house-2
        await useHouseStore.getState().setActiveHouseId('house-2');
        // Simulate subscribeToLogs being called by HouseSync — set logs for house-2
        const logX: TaskLog = { id: 'log-x', taskId: 'task-2', memberId: 'owner-1', completedAt: '2024-01-01T00:00:00.000Z' };
        useHouseStore.setState({ logs: [logX] });

        await useHouseStore.getState().removeLogFromHouse('log-x');

        expect(useHouseStore.getState().logs).toHaveLength(0);
        // deleteDoc was called for the log in house-2
        expect(jest.mocked(deleteDoc)).toHaveBeenCalledTimes(1);
    });
});

// ─── 140 ─────────────────────────────────────────────────────────────────────

describe('140 — ciclo de auth', () => {
    test('logout → estado zerado → login → carrega casas do Firestore', async () => {
        // Estado inicial: usuário logado com dados
        const house = makeHouse({ id: 'house-1' });
        useHouseStore.setState({
            houses: [house],
            activeHouseId: 'house-1',
            loadingHouses: false,
            logs: [{ id: 'log-1', taskId: 'task-1', memberId: 'owner-1', completedAt: '2024-01-01T00:00:00.000Z' }],
        });

        // ── Logout ────────────────────────────────────────────────────────────
        // HouseSync chama reset() quando userId vira null
        useHouseStore.getState().reset();

        expect(useHouseStore.getState().houses).toEqual([]);
        expect(useHouseStore.getState().pendingHouses).toEqual([]);
        expect(useHouseStore.getState().activeHouseId).toBeNull();
        expect(useHouseStore.getState().loadingHouses).toBe(false);
        expect(useHouseStore.getState().logs).toEqual([]);

        // ── Re-login ──────────────────────────────────────────────────────────
        // Sem activeHouseId salvo → usa a primeira casa
        jest.mocked(loadActiveHouseId).mockResolvedValue(null);

        // getDocs returns empty (no subcollection logs to query during period check)
        jest.mocked(getDocs).mockResolvedValue({ docs: [], empty: true } as any);

        const fireSnapshot = captureMemberSnapshot();
        const unsub = useHouseStore.getState().subscribe('user-1');

        // Firestore entrega as casas do usuário
        const reloadedHouse = makeHouse({ id: 'house-1' });
        await fireSnapshot(makeQuerySnap([reloadedHouse]));

        const state = useHouseStore.getState();
        expect(state.houses).toHaveLength(1);
        expect(state.houses[0].id).toBe('house-1');
        expect(state.activeHouseId).toBe('house-1');
        expect(state.loadingHouses).toBe(false);

        unsub();
    });
});

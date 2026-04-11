/**
 * Store tests — HouseContext (testes 94–112)
 *
 * Estratégia: mock do Firestore + AuthContext.
 * Zustand state é manipulado diretamente via setState/getState.
 */

import * as Crypto from 'expo-crypto';
import {
    getDocs,
    getDoc,
    updateDoc,
    setDoc,
    deleteDoc,
    where,
    writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useHouseStore } from '../HouseContext';
import { useAuthStore } from '../AuthContext';
import { saveActiveHouseId } from '../../services/storage';
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
    // Retorna o valor diretamente para simplificar as asserções
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
        periodStart: '2024-01-01T00:00:00.000Z',
        history: [],
        pendingRequests: [],
        pendingMemberIds: [],
        ...overrides,
    };
}

/** Simula um QuerySnapshot do Firestore */
function makeQuerySnap(houses: House[]) {
    return {
        empty: houses.length === 0,
        docs: houses.map((h) => ({ ref: {}, data: () => h, id: h.id })),
    };
}

/** Simula um DocumentSnapshot do Firestore */
function makeDocSnap(house: House | null) {
    return {
        exists: () => house !== null,
        data: () => house,
    };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();

    // UUID determinístico com contador crescente
    let counter = 0;
    jest.mocked(Crypto.randomUUID).mockImplementation(
        () =>
            `${(++counter).toString(16).padStart(8, '0')}-0000-4000-8000-000000000000` as ReturnType<
                typeof Crypto.randomUUID
            >,
    );

    // Auth padrão: user-1
    (useAuthStore.getState as jest.Mock).mockReturnValue({
        user: { uid: 'user-1', displayName: 'Alice' },
    });

    // Store limpo
    useHouseStore.setState({
        houses: [],
        pendingHouses: [],
        activeHouseId: null,
        loadingHouses: false,
        logs: [],
        logsLoading: false,
    });
});

// ─── joinHouseByCode ──────────────────────────────────────────────────────────

// joinHouseByCode busca a toca no Firestore diretamente (sem Cloud Function).
describe('joinHouseByCode', () => {
    // 94
    test('código válido retorna { success: true, pending: true }', async () => {
        const house = makeHouse({ memberIds: ['owner-1'], pendingMemberIds: [] });
        jest.mocked(getDocs).mockResolvedValue(makeQuerySnap([house]) as any);

        const result = await useHouseStore.getState().joinHouseByCode('XYZ12345');
        expect(result).toEqual({ success: true, pending: true });
    });

    // 95
    test('normaliza o código para maiúsculas antes de buscar', async () => {
        const house = makeHouse({ memberIds: ['owner-1'], pendingMemberIds: [] });
        jest.mocked(getDocs).mockResolvedValue(makeQuerySnap([house]) as any);

        await useHouseStore.getState().joinHouseByCode('xyz12345');
        expect(jest.mocked(where)).toHaveBeenCalledWith('code', '==', 'XYZ12345');
    });

    // 96
    test('código não encontrado retorna erro', async () => {
        jest.mocked(getDocs).mockResolvedValue(makeQuerySnap([]) as any);

        const result = await useHouseStore.getState().joinHouseByCode('NOPE0000');
        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
    });

    // 97
    test('usuário já membro retorna erro', async () => {
        const house = makeHouse({ memberIds: ['user-1'], pendingMemberIds: [] });
        jest.mocked(getDocs).mockResolvedValue(makeQuerySnap([house]) as any);

        const result = await useHouseStore.getState().joinHouseByCode('ABC12345');
        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
    });

    // 98
    test('usuário já pendente retorna erro', async () => {
        const house = makeHouse({ memberIds: ['owner-1'], pendingMemberIds: ['user-1'] });
        jest.mocked(getDocs).mockResolvedValue(makeQuerySnap([house]) as any);

        const result = await useHouseStore.getState().joinHouseByCode('ABC12345');
        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
    });

    // 99
    test('erro de rede retorna { success: false, error }', async () => {
        jest.mocked(getDocs).mockRejectedValue(
            Object.assign(new Error('network error'), { code: 'unavailable' }),
        );

        const result = await useHouseStore.getState().joinHouseByCode('ABC12345');
        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
    });
});

// ─── approveJoinRequest ───────────────────────────────────────────────────────

describe('approveJoinRequest', () => {
    const pendingRequest: JoinRequest = {
        userId: 'user-2',
        name: 'Bob',
        requestedAt: '2024-01-10T00:00:00.000Z',
    };
    const house = makeHouse({
        pendingRequests: [pendingRequest],
        pendingMemberIds: ['user-2'],
    });

    beforeEach(() => {
        jest.mocked(getDoc).mockResolvedValue(makeDocSnap(house) as any);
    });

    // 100
    test('move userId de pendingMemberIds para memberIds', async () => {
        await useHouseStore.getState().approveJoinRequest('house-1', 'user-2');
        const [, fields] = jest.mocked(updateDoc).mock.calls[0] as unknown as [
            unknown,
            Record<string, unknown>,
        ];
        // memberIds recebe arrayUnion('user-2') → mockado retorna 'user-2'
        expect(fields.memberIds).toBe('user-2');
        // pendingMemberIds filtrado (sem user-2)
        expect(fields.pendingMemberIds).toEqual([]);
    });

    // 101
    test('remove entrada de pendingRequests', async () => {
        await useHouseStore.getState().approveJoinRequest('house-1', 'user-2');
        const [, fields] = jest.mocked(updateDoc).mock.calls[0] as unknown as [
            unknown,
            Record<string, unknown>,
        ];
        expect(fields.pendingRequests).toEqual([]);
    });
});

// ─── rejectJoinRequest ────────────────────────────────────────────────────────

describe('rejectJoinRequest', () => {
    const pendingRequest: JoinRequest = {
        userId: 'user-2',
        name: 'Bob',
        requestedAt: '2024-01-10T00:00:00.000Z',
    };
    const house = makeHouse({
        pendingRequests: [pendingRequest],
        pendingMemberIds: ['user-2'],
    });

    beforeEach(() => {
        jest.mocked(getDoc).mockResolvedValue(makeDocSnap(house) as any);
    });

    // 102
    test('remove de pendingRequests sem adicionar a members', async () => {
        await useHouseStore.getState().rejectJoinRequest('house-1', 'user-2');
        const [, fields] = jest.mocked(updateDoc).mock.calls[0] as unknown as [
            unknown,
            Record<string, unknown>,
        ];
        expect(fields.pendingRequests).toEqual([]);
        expect(fields).not.toHaveProperty('members');
        expect(fields).not.toHaveProperty('memberIds');
    });

    // 103
    test('remove de pendingMemberIds', async () => {
        await useHouseStore.getState().rejectJoinRequest('house-1', 'user-2');
        const [, fields] = jest.mocked(updateDoc).mock.calls[0] as unknown as [
            unknown,
            Record<string, unknown>,
        ];
        expect(fields.pendingMemberIds).toEqual([]);
    });
});

// ─── leaveHouse ───────────────────────────────────────────────────────────────

describe('leaveHouse', () => {
    // 104
    test('remove usuário de memberIds no Firestore', async () => {
        const house = makeHouse({
            memberIds: ['user-1', 'owner-1'],
            members: [
                { id: 'user-1', name: 'Alice' },
                { id: 'owner-1', name: 'Owner' },
            ],
        });
        jest.mocked(getDoc).mockResolvedValue(makeDocSnap(house) as any);

        await useHouseStore.getState().leaveHouse('house-1');

        const [, fields] = jest.mocked(updateDoc).mock.calls[0] as unknown as [
            unknown,
            Record<string, unknown>,
        ];
        expect(fields.memberIds).not.toContain('user-1');
        expect(fields.memberIds).toContain('owner-1');
    });

    // 105
    test('limpa activeHouseId quando era a casa ativa e não há outra', async () => {
        const house = makeHouse({
            memberIds: ['user-1', 'owner-1'],
            members: [
                { id: 'user-1', name: 'Alice' },
                { id: 'owner-1', name: 'Owner' },
            ],
        });
        jest.mocked(getDoc).mockResolvedValue(makeDocSnap(house) as any);
        useHouseStore.setState({
            houses: [house],
            activeHouseId: 'house-1',
        });

        await useHouseStore.getState().leaveHouse('house-1');

        expect(useHouseStore.getState().activeHouseId).toBeNull();
    });

    // 106
    test('seleciona outra casa como ativa quando disponível', async () => {
        const house1 = makeHouse({
            id: 'house-1',
            memberIds: ['user-1', 'owner-1'],
            members: [
                { id: 'user-1', name: 'Alice' },
                { id: 'owner-1', name: 'Owner' },
            ],
        });
        const house2 = makeHouse({ id: 'house-2', code: 'DEF456' });
        jest.mocked(getDoc).mockResolvedValue(makeDocSnap(house1) as any);
        useHouseStore.setState({
            houses: [house1, house2],
            activeHouseId: 'house-1',
        });

        await useHouseStore.getState().leaveHouse('house-1');

        expect(useHouseStore.getState().activeHouseId).toBe('house-2');
    });
});

// ─── addHouseToList ───────────────────────────────────────────────────────────

describe('addHouseToList', () => {
    // 107
    test('adiciona casa ao estado e define como ativa', async () => {
        const newHouse = makeHouse({ id: 'house-new', code: 'NEW123' });

        await useHouseStore.getState().addHouseToList(newHouse);

        expect(jest.mocked(setDoc)).toHaveBeenCalledWith(
            expect.anything(),
            newHouse,
        );
        expect(useHouseStore.getState().activeHouseId).toBe('house-new');
        expect(jest.mocked(saveActiveHouseId)).toHaveBeenCalledWith('house-new');
    });
});

// ─── logTaskInHouse ───────────────────────────────────────────────────────────

describe('logTaskInHouse', () => {
    // 108
    test('adiciona log com memberId e taskId corretos', async () => {
        const house = makeHouse({
            memberIds: ['user-1'],
            members: [{ id: 'user-1', name: 'Alice' }],
        });
        useHouseStore.setState({ houses: [house], activeHouseId: 'house-1' });

        await useHouseStore.getState().logTaskInHouse('task-1');

        // Log is written to subcollection via setDoc (not updateDoc on house)
        const storeLogs = useHouseStore.getState().logs;
        expect(storeLogs).toHaveLength(1);
        expect(storeLogs[0].taskId).toBe('task-1');
        expect(storeLogs[0].memberId).toBe('user-1');
        expect(jest.mocked(setDoc)).toHaveBeenCalledTimes(1);
    });
});

// ─── updateLogInHouse ─────────────────────────────────────────────────────────

describe('updateLogInHouse', () => {
    // 109
    test('muda taskId sem criar novo log', async () => {
        const house = makeHouse({
            tasks: [
                { id: 'task-1', name: 'A', points: 10, isDefault: true },
                { id: 'task-2', name: 'B', points: 20, isDefault: true },
            ],
        });
        useHouseStore.setState({
            houses: [house],
            activeHouseId: 'house-1',
            logs: [
                {
                    id: 'log-1',
                    taskId: 'task-1',
                    memberId: 'owner-1',
                    completedAt: '2024-01-01T00:00:00.000Z',
                },
            ],
        });

        await useHouseStore.getState().updateLogInHouse('log-1', 'task-2');

        // Store log updated
        expect(useHouseStore.getState().logs).toHaveLength(1);
        expect(useHouseStore.getState().logs[0].taskId).toBe('task-2');

        // updateDoc called on the log doc in subcollection
        expect(jest.mocked(updateDoc)).toHaveBeenCalledWith(
            expect.anything(),
            { taskId: 'task-2' },
        );
    });
});

// ─── removeLogFromHouse ───────────────────────────────────────────────────────

describe('removeLogFromHouse', () => {
    // 110
    test('remove só o log alvo, deixa os outros intactos', async () => {
        const house = makeHouse();
        useHouseStore.setState({
            houses: [house],
            activeHouseId: 'house-1',
            logs: [
                {
                    id: 'log-1',
                    taskId: 'task-1',
                    memberId: 'owner-1',
                    completedAt: '2024-01-01T00:00:00.000Z',
                },
                {
                    id: 'log-2',
                    taskId: 'task-1',
                    memberId: 'owner-1',
                    completedAt: '2024-01-02T00:00:00.000Z',
                },
            ],
        });

        await useHouseStore.getState().removeLogFromHouse('log-1');

        expect(useHouseStore.getState().logs).toHaveLength(1);
        expect(useHouseStore.getState().logs[0].id).toBe('log-2');
        expect(jest.mocked(deleteDoc)).toHaveBeenCalledTimes(1);
    });
});

// ─── addTaskAndLogInHouse ─────────────────────────────────────────────────────

describe('addTaskAndLogInHouse', () => {
    // 111
    test('cria tarefa E registra log no mesmo passo', async () => {
        const house = makeHouse({
            memberIds: ['user-1'],
            members: [{ id: 'user-1', name: 'Alice' }],
        });
        useHouseStore.setState({ houses: [house], activeHouseId: 'house-1' });

        await useHouseStore
            .getState()
            .addTaskAndLogInHouse('Nova tarefa', 15);

        // Task created in house doc
        const updatedHouse = useHouseStore.getState().houses[0];
        const newTask = updatedHouse.tasks.find((t) => t.name === 'Nova tarefa');
        expect(newTask).toBeDefined();
        expect(newTask?.points).toBe(15);

        // Log in store
        const storeLogs = useHouseStore.getState().logs;
        expect(storeLogs).toHaveLength(1);
        expect(storeLogs[0].memberId).toBe('user-1');
    });
});

// ─── removeTaskFromHouse (limpeza de logs) ────────────────────────────────────

describe('removeTaskFromHouse', () => {
    // 112
    test('deletar tarefa remove todos os logs associados da subcollection', async () => {
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

        const mockBatch = { delete: jest.fn(), set: jest.fn(), commit: jest.fn(() => Promise.resolve()) };
        jest.mocked(writeBatch).mockReturnValue(mockBatch as any);

        useHouseStore.setState({ houses: [house], activeHouseId: 'house-1', logs: logsInStore });

        await useHouseStore.getState().removeTaskFromHouse('task-1');

        // Store logs updated — only task-2 log remains
        const remainingLogs = useHouseStore.getState().logs;
        expect(remainingLogs).toHaveLength(1);
        expect(remainingLogs.every((l) => l.taskId !== 'task-1')).toBe(true);

        // writeBatch was called to delete the orphaned log
        expect(jest.mocked(writeBatch)).toHaveBeenCalled();
        expect(mockBatch.delete).toHaveBeenCalledTimes(1);
        expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });
});

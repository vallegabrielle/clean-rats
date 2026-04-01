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
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useHouseStore } from '../HouseContext';
import { useAuthStore } from '../AuthContext';
import { saveActiveHouseId } from '../../services/storage';
import { House, JoinRequest } from '../../types';

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
    getDocs: jest.fn(),
    getDoc: jest.fn(),
    // Retorna o valor diretamente para simplificar as asserções
    arrayUnion: jest.fn((value) => value),
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
        logs: [],
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
        docs: houses.map((h) => ({ data: () => h, id: h.id })),
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
    });
});

// ─── joinHouseByCode ──────────────────────────────────────────────────────────

// joinHouseByCode é um wrapper fino em torno da Cloud Function.
// A lógica de negócio (Firestore, rate limit, validações) reside no servidor.
describe('joinHouseByCode', () => {
    let mockCallable: jest.Mock;

    beforeEach(() => {
        mockCallable = jest.fn(() =>
            Promise.resolve({ data: { success: true, pending: true } }),
        );
        jest.mocked(httpsCallable).mockReturnValue(mockCallable as any);
    });

    // 94
    test('código válido retorna { success: true, pending: true }', async () => {
        const result = await useHouseStore.getState().joinHouseByCode('XYZ999');
        expect(result).toEqual({ success: true, pending: true });
    });

    // 95
    test('chama Cloud Function com o código normalizado em maiúsculas', async () => {
        await useHouseStore.getState().joinHouseByCode('xyz999');
        expect(mockCallable).toHaveBeenCalledWith({ code: 'XYZ999' });
    });

    // 96
    test('propaga resposta de erro da Cloud Function', async () => {
        mockCallable.mockResolvedValue({
            data: { success: false, error: 'Código não encontrado.' },
        });
        const result = await useHouseStore.getState().joinHouseByCode('NOPE00');
        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
    });

    // 97
    test('código inválido retorna erro', async () => {
        mockCallable.mockResolvedValue({
            data: { success: false, error: 'Código não encontrado.' },
        });
        const result = await useHouseStore.getState().joinHouseByCode('NOPE00');
        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
    });

    // 98
    test('usuário já membro retorna erro', async () => {
        mockCallable.mockResolvedValue({
            data: { success: false, error: 'Você já faz parte desta toca.' },
        });
        const result = await useHouseStore.getState().joinHouseByCode('ABC123');
        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
    });

    // 99
    test('usuário já pendente retorna erro', async () => {
        mockCallable.mockResolvedValue({
            data: { success: false, error: 'Você já enviou uma solicitação para esta toca.' },
        });
        const result = await useHouseStore.getState().joinHouseByCode('ABC123');
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
        const [, fields] = jest.mocked(updateDoc).mock.calls[0] as [
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
        const [, fields] = jest.mocked(updateDoc).mock.calls[0] as [
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
        const [, fields] = jest.mocked(updateDoc).mock.calls[0] as [
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
        const [, fields] = jest.mocked(updateDoc).mock.calls[0] as [
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

        const [, fields] = jest.mocked(updateDoc).mock.calls[0] as [
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

        await useHouseStore.getState().logTaskInHouse('task-1', 'user-1');

        const [, fields] = jest.mocked(updateDoc).mock.calls[0] as [
            unknown,
            { logs: Array<{ taskId: string; memberId: string }> },
        ];
        expect(fields.logs).toHaveLength(1);
        expect(fields.logs[0].taskId).toBe('task-1');
        expect(fields.logs[0].memberId).toBe('user-1');
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
            logs: [
                {
                    id: 'log-1',
                    taskId: 'task-1',
                    memberId: 'owner-1',
                    completedAt: '2024-01-01T00:00:00.000Z',
                },
            ],
        });
        useHouseStore.setState({ houses: [house], activeHouseId: 'house-1' });

        await useHouseStore.getState().updateLogInHouse('log-1', 'task-2');

        const [, fields] = jest.mocked(updateDoc).mock.calls[0] as [
            unknown,
            { logs: Array<{ id: string; taskId: string }> },
        ];
        expect(fields.logs).toHaveLength(1);
        expect(fields.logs[0].taskId).toBe('task-2');
    });
});

// ─── removeLogFromHouse ───────────────────────────────────────────────────────

describe('removeLogFromHouse', () => {
    // 110
    test('remove só o log alvo, deixa os outros intactos', async () => {
        const house = makeHouse({
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
        useHouseStore.setState({ houses: [house], activeHouseId: 'house-1' });

        await useHouseStore.getState().removeLogFromHouse('log-1');

        const [, fields] = jest.mocked(updateDoc).mock.calls[0] as [
            unknown,
            { logs: Array<{ id: string }> },
        ];
        expect(fields.logs).toHaveLength(1);
        expect(fields.logs[0].id).toBe('log-2');
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
            .addTaskAndLogInHouse('Nova tarefa', 15, 'user-1');

        const [, fields] = jest.mocked(updateDoc).mock.calls[0] as [
            unknown,
            { tasks: Array<{ name: string; points: number }>; logs: unknown[] },
        ];

        // Tarefa criada com nome e pontos corretos
        const newTask = fields.tasks.find((t) => t.name === 'Nova tarefa');
        expect(newTask).toBeDefined();
        expect(newTask?.points).toBe(15);

        // Log criado — deve conter ao menos 1 entrada
        expect(fields.logs.length).toBeGreaterThanOrEqual(1);
    });
});

// ─── removeTaskFromHouse (limpeza de logs) ────────────────────────────────────

describe('removeTaskFromHouse', () => {
    /**
     * Teste 112 — comportamento esperado: ao deletar uma tarefa, todos os logs
     * dessa tarefa devem ser removidos junto.
     *
     * ATENÇÃO: a implementação atual só atualiza `tasks` no Firestore,
     * deixando os logs órfãos. Este teste FALHA intencionalmente para
     * documentar a lacuna e motivar a correção no store.
     */
    test('deletar tarefa remove todos os logs associados (112)', async () => {
        const house = makeHouse({
            tasks: [
                { id: 'task-1', name: 'A', points: 10, isDefault: true },
                { id: 'task-2', name: 'B', points: 20, isDefault: true },
            ],
            logs: [
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
            ],
        });
        useHouseStore.setState({ houses: [house], activeHouseId: 'house-1' });

        await useHouseStore.getState().removeTaskFromHouse('task-1');

        const [, fields] = jest.mocked(updateDoc).mock.calls[0] as [
            unknown,
            Record<string, unknown>,
        ];

        // Esperado: logs de task-1 devem ser removidos
        const remainingLogs = fields.logs as Array<{ taskId: string }> | undefined;
        expect(remainingLogs).toBeDefined();
        expect(remainingLogs?.every((l) => l.taskId !== 'task-1')).toBe(true);
    });
});

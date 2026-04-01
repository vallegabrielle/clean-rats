import * as Crypto from 'expo-crypto';
import {
    createHouse,
    addTask,
    removeTask,
    updateTask,
    logTask,
    removeLog,
    updateLog,
} from '../house';
import { DEFAULT_TASKS } from '../../constants';
import { House } from '../../types';

jest.mock('expo-crypto');

function makeHouse(overrides: Partial<House> = {}): House {
    return {
        id: 'house-1',
        name: 'Test House',
        code: 'ABC123',
        period: 'weekly',
        memberIds: ['user-1'],
        members: [{ id: 'user-1', name: 'Alice' }],
        tasks: [{ id: 'task-1', name: 'Lavar louça', points: 10, isDefault: true }],
        logs: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        periodStart: '2024-01-01T00:00:00.000Z',
        history: [],
        ...overrides,
    };
}

beforeEach(() => {
    let n = 0;
    jest.mocked(Crypto.randomUUID).mockImplementation(() => {
        n++;
        return `${n.toString(16).padStart(8, '0')}-0000-4000-8000-000000000000` as ReturnType<typeof Crypto.randomUUID>;
    });
    // getRandomBytes returns a fixed Uint8Array so generateCode is deterministic
    jest.mocked(Crypto.getRandomBytes).mockImplementation((count: number) =>
        new Uint8Array(count).fill(0),
    );
});

// ─── createHouse ────────────────────────────────────────────────────────────

describe('createHouse', () => {
    test('código tem exatamente 8 caracteres', () => {
        const house = createHouse('Minha Toca', 'weekly', 'uid-1', 'Alice');
        expect(house.code).toHaveLength(8);
    });

    test('código usa o alfabeto Crockford Base32', () => {
        const house = createHouse('Minha Toca', 'weekly', 'uid-1', 'Alice');
        expect(house.code).toMatch(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$/);
    });

    test('contém todos os campos obrigatórios', () => {
        const house = createHouse('Minha Toca', 'weekly', 'uid-1', 'Alice');
        expect(house).toMatchObject({
            id: expect.any(String),
            name: 'Minha Toca',
            code: expect.any(String),
            period: 'weekly',
            memberIds: expect.any(Array),
            members: expect.any(Array),
            tasks: expect.any(Array),
            logs: [],
            createdAt: expect.any(String),
            periodStart: expect.any(String),
            history: [],
        });
    });

    test('dono é members[0] com dados corretos', () => {
        const house = createHouse('Toca', 'monthly', 'uid-42', 'Bob');
        expect(house.members[0]).toEqual({ id: 'uid-42', name: 'Bob' });
    });

    test('uid do dono está em memberIds[0]', () => {
        const house = createHouse('Toca', 'monthly', 'uid-42', 'Bob');
        expect(house.memberIds[0]).toBe('uid-42');
    });

    test('usa DEFAULT_TASKS quando selectedTasks não é fornecido', () => {
        const house = createHouse('Toca', 'weekly', 'uid-1', 'Alice');
        expect(house.tasks).toHaveLength(DEFAULT_TASKS.length);
        house.tasks.forEach((t, i) => {
            expect(t.name).toBe(DEFAULT_TASKS[i].name);
            expect(t.points).toBe(DEFAULT_TASKS[i].points);
        });
    });

    test('usa selectedTasks quando fornecido', () => {
        const custom = [
            { name: 'Tarefa A', points: 5, isDefault: false as const },
            { name: 'Tarefa B', points: 10, isDefault: false as const },
        ];
        const house = createHouse('Toca', 'weekly', 'uid-1', 'Alice', custom);
        expect(house.tasks).toHaveLength(2);
        expect(house.tasks[0].name).toBe('Tarefa A');
        expect(house.tasks[1].name).toBe('Tarefa B');
    });

    test('cada tarefa recebe id único', () => {
        const house = createHouse('Toca', 'weekly', 'uid-1', 'Alice');
        const ids = house.tasks.map((t) => t.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    test('createdAt é ISO válido', () => {
        const house = createHouse('Toca', 'weekly', 'uid-1', 'Alice');
        expect(new Date(house.createdAt).toString()).not.toBe('Invalid Date');
    });

    test('logs começa vazio', () => {
        const house = createHouse('Toca', 'weekly', 'uid-1', 'Alice');
        expect(house.logs).toEqual([]);
    });

    test('history começa vazio', () => {
        const house = createHouse('Toca', 'weekly', 'uid-1', 'Alice');
        expect(house.history).toEqual([]);
    });
});

// ─── addTask ────────────────────────────────────────────────────────────────

describe('addTask', () => {
    test('adiciona tarefa à lista', () => {
        const { house: updated } = addTask(makeHouse(), 'Nova tarefa', 15);
        expect(updated.tasks).toHaveLength(2);
    });

    test('nova tarefa tem nome e pontos corretos', () => {
        const { task } = addTask(makeHouse(), 'Varrer', 20);
        expect(task).toMatchObject({ name: 'Varrer', points: 20 });
    });

    test('nova tarefa tem isDefault = false', () => {
        const { task } = addTask(makeHouse(), 'Tarefa', 5);
        expect(task.isDefault).toBe(false);
    });

    test('nova tarefa tem id gerado', () => {
        const { task } = addTask(makeHouse(), 'Tarefa', 5);
        expect(task.id).toBeTruthy();
    });

    test('tarefas existentes são preservadas', () => {
        const house = makeHouse();
        const { house: updated } = addTask(house, 'Nova', 5);
        expect(updated.tasks[0]).toEqual(house.tasks[0]);
    });

    test('lança erro quando pontos = 0', () => {
        expect(() => addTask(makeHouse(), 'Tarefa', 0)).toThrow('Points must be greater than 0');
    });

    test('lança erro quando pontos < 0', () => {
        expect(() => addTask(makeHouse(), 'Tarefa', -5)).toThrow('Points must be greater than 0');
    });
});

// ─── removeTask ─────────────────────────────────────────────────────────────

describe('removeTask', () => {
    test('remove a tarefa alvo', () => {
        const house = makeHouse({
            tasks: [
                { id: 'task-1', name: 'A', points: 10, isDefault: true },
                { id: 'task-2', name: 'B', points: 20, isDefault: true },
            ],
        });
        const result = removeTask(house, 'task-1');
        expect(result.tasks).toHaveLength(1);
        expect(result.tasks[0].id).toBe('task-2');
    });

    test('não afeta outras tarefas', () => {
        const house = makeHouse({
            tasks: [
                { id: 'task-1', name: 'A', points: 10, isDefault: true },
                { id: 'task-2', name: 'B', points: 20, isDefault: true },
            ],
        });
        const result = removeTask(house, 'task-1');
        expect(result.tasks[0]).toEqual(house.tasks[1]);
    });

    // Comportamento atual: limpeza de logs é responsabilidade do store,
    // não desta função. Este teste documenta isso explicitamente.
    test('não remove logs da tarefa deletada (responsabilidade do store)', () => {
        const house = makeHouse({
            logs: [{ id: 'log-1', taskId: 'task-1', memberId: 'user-1', completedAt: '2024-01-01T00:00:00.000Z' }],
        });
        const result = removeTask(house, 'task-1');
        expect(result.logs).toHaveLength(1);
    });

    test('retorna novo objeto (imutabilidade)', () => {
        const house = makeHouse();
        expect(removeTask(house, 'task-1')).not.toBe(house);
    });
});

// ─── updateTask ─────────────────────────────────────────────────────────────

describe('updateTask', () => {
    test('atualiza nome e pontos da tarefa alvo', () => {
        const result = updateTask(makeHouse(), 'task-1', 'Novo nome', 99);
        expect(result.tasks[0]).toMatchObject({ id: 'task-1', name: 'Novo nome', points: 99 });
    });

    test('não altera outras tarefas', () => {
        const house = makeHouse({
            tasks: [
                { id: 'task-1', name: 'A', points: 10, isDefault: true },
                { id: 'task-2', name: 'B', points: 20, isDefault: true },
            ],
        });
        const result = updateTask(house, 'task-1', 'A editado', 15);
        expect(result.tasks[1]).toEqual(house.tasks[1]);
    });

    test('lança erro quando pontos = 0', () => {
        expect(() => updateTask(makeHouse(), 'task-1', 'Nome', 0)).toThrow('Points must be greater than 0');
    });

    test('lança erro quando pontos < 0', () => {
        expect(() => updateTask(makeHouse(), 'task-1', 'Nome', -1)).toThrow('Points must be greater than 0');
    });
});

// ─── logTask ────────────────────────────────────────────────────────────────

describe('logTask', () => {
    test('cria log com taskId e memberId corretos', () => {
        const result = logTask(makeHouse(), 'task-1', 'user-1');
        expect(result.logs[0].taskId).toBe('task-1');
        expect(result.logs[0].memberId).toBe('user-1');
    });

    test('log tem completedAt como ISO válido', () => {
        const result = logTask(makeHouse(), 'task-1', 'user-1');
        expect(new Date(result.logs[0].completedAt).toString()).not.toBe('Invalid Date');
    });

    test('log tem id gerado', () => {
        const result = logTask(makeHouse(), 'task-1', 'user-1');
        expect(result.logs[0].id).toBeTruthy();
    });

    test('lança erro para taskId inexistente', () => {
        expect(() => logTask(makeHouse(), 'task-inexistente', 'user-1')).toThrow(
            'Task task-inexistente not found in house',
        );
    });

    test('lança erro para memberId inexistente', () => {
        expect(() => logTask(makeHouse(), 'task-1', 'user-inexistente')).toThrow(
            'Member user-inexistente not found in house',
        );
    });

    test('adiciona ao array de logs existente sem remover os anteriores', () => {
        const existing = {
            id: 'log-existente',
            taskId: 'task-1',
            memberId: 'user-1',
            completedAt: '2024-01-01T00:00:00.000Z',
        };
        const house = makeHouse({ logs: [existing] });
        const result = logTask(house, 'task-1', 'user-1');
        expect(result.logs).toHaveLength(2);
        expect(result.logs[0]).toEqual(existing);
    });
});

// ─── removeLog ──────────────────────────────────────────────────────────────

describe('removeLog', () => {
    test('remove o log alvo', () => {
        const house = makeHouse({
            logs: [
                { id: 'log-1', taskId: 'task-1', memberId: 'user-1', completedAt: '2024-01-01T00:00:00.000Z' },
                { id: 'log-2', taskId: 'task-1', memberId: 'user-1', completedAt: '2024-01-02T00:00:00.000Z' },
            ],
        });
        const result = removeLog(house, 'log-1');
        expect(result.logs).toHaveLength(1);
        expect(result.logs[0].id).toBe('log-2');
    });

    test('não remove outros logs', () => {
        const log2 = { id: 'log-2', taskId: 'task-1', memberId: 'user-1', completedAt: '2024-01-02T00:00:00.000Z' };
        const house = makeHouse({
            logs: [
                { id: 'log-1', taskId: 'task-1', memberId: 'user-1', completedAt: '2024-01-01T00:00:00.000Z' },
                log2,
            ],
        });
        expect(removeLog(house, 'log-1').logs[0]).toEqual(log2);
    });

    test('lista vazia quando não há mais logs', () => {
        const house = makeHouse({
            logs: [{ id: 'log-1', taskId: 'task-1', memberId: 'user-1', completedAt: '2024-01-01T00:00:00.000Z' }],
        });
        expect(removeLog(house, 'log-1').logs).toEqual([]);
    });
});

// ─── updateLog ──────────────────────────────────────────────────────────────

describe('updateLog', () => {
    const houseWithTwoTasks = () =>
        makeHouse({
            tasks: [
                { id: 'task-1', name: 'A', points: 10, isDefault: true },
                { id: 'task-2', name: 'B', points: 20, isDefault: true },
            ],
            logs: [{ id: 'log-1', taskId: 'task-1', memberId: 'user-1', completedAt: '2024-01-01T00:00:00.000Z' }],
        });

    test('troca taskId do log alvo', () => {
        const result = updateLog(houseWithTwoTasks(), 'log-1', 'task-2');
        expect(result.logs[0].taskId).toBe('task-2');
    });

    test('não cria novo log', () => {
        const result = updateLog(houseWithTwoTasks(), 'log-1', 'task-2');
        expect(result.logs).toHaveLength(1);
    });

    test('não altera outros logs', () => {
        const log2 = { id: 'log-2', taskId: 'task-1', memberId: 'user-1', completedAt: '2024-01-02T00:00:00.000Z' };
        const house = makeHouse({
            tasks: [
                { id: 'task-1', name: 'A', points: 10, isDefault: true },
                { id: 'task-2', name: 'B', points: 20, isDefault: true },
            ],
            logs: [
                { id: 'log-1', taskId: 'task-1', memberId: 'user-1', completedAt: '2024-01-01T00:00:00.000Z' },
                log2,
            ],
        });
        expect(updateLog(house, 'log-1', 'task-2').logs[1]).toEqual(log2);
    });

    test('lança erro para taskId inexistente', () => {
        expect(() => updateLog(houseWithTwoTasks(), 'log-1', 'task-inexistente')).toThrow();
    });
});

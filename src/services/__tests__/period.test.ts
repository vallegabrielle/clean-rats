import {
    getCurrentPeriodStart,
    computeScores,
    computePeriodScores,
    checkAndResetPeriod,
} from '../period';
import { House } from '../../types';

function makeHouse(overrides: Partial<House> = {}): House {
    return {
        id: 'house-1',
        name: 'Test',
        code: 'ABC123',
        period: 'weekly',
        memberIds: ['u1', 'u2'],
        members: [
            { id: 'u1', name: 'Alice' },
            { id: 'u2', name: 'Bob' },
        ],
        tasks: [
            { id: 't1', name: 'Lavar louça', points: 10, isDefault: true },
            { id: 't2', name: 'Varrer', points: 20, isDefault: true },
        ],
        logs: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        // Jan 14, 2024 é domingo — início correto da semana de Jan 17
        periodStart: new Date(2024, 0, 14).toISOString(),
        history: [],
        ...overrides,
    };
}

// ─── getCurrentPeriodStart ──────────────────────────────────────────────────

describe('getCurrentPeriodStart', () => {
    // Jan 10, 2024 = quarta-feira (getDay() = 3)
    // Início da semana = Jan 7 (domingo)
    test('weekly: retorna o domingo da semana atual', () => {
        const wednesday = new Date(2024, 0, 10);
        const result = getCurrentPeriodStart('weekly', wednesday);
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(0);
        expect(result.getDate()).toBe(7);
    });

    test('weekly: domingo retorna o próprio dia', () => {
        const sunday = new Date(2024, 0, 7);
        const result = getCurrentPeriodStart('weekly', sunday);
        expect(result.getDate()).toBe(7);
    });

    test('weekly: segunda-feira recua até domingo', () => {
        const monday = new Date(2024, 0, 8);
        const result = getCurrentPeriodStart('weekly', monday);
        expect(result.getDate()).toBe(7);
    });

    test('weekly: sábado recua até domingo da mesma semana', () => {
        const saturday = new Date(2024, 0, 13); // Sat Jan 13
        const result = getCurrentPeriodStart('weekly', saturday);
        expect(result.getDate()).toBe(7);
    });

    test('biweekly: dia 1–15 retorna dia 1 do mês', () => {
        const day10 = new Date(2024, 0, 10);
        const result = getCurrentPeriodStart('biweekly', day10);
        expect(result.getDate()).toBe(1);
        expect(result.getMonth()).toBe(0);
    });

    test('biweekly: dia 16+ retorna dia 16 do mês', () => {
        const day20 = new Date(2024, 0, 20);
        const result = getCurrentPeriodStart('biweekly', day20);
        expect(result.getDate()).toBe(16);
    });

    test('biweekly: exatamente dia 15 retorna dia 1', () => {
        const day15 = new Date(2024, 0, 15);
        const result = getCurrentPeriodStart('biweekly', day15);
        expect(result.getDate()).toBe(1);
    });

    test('biweekly: exatamente dia 16 retorna dia 16', () => {
        const day16 = new Date(2024, 0, 16);
        const result = getCurrentPeriodStart('biweekly', day16);
        expect(result.getDate()).toBe(16);
    });

    test('monthly: retorna dia 1 do mês', () => {
        const anyDay = new Date(2024, 2, 17); // Mar 17
        const result = getCurrentPeriodStart('monthly', anyDay);
        expect(result.getDate()).toBe(1);
        expect(result.getMonth()).toBe(2);
    });

    test('monthly: já no dia 1 retorna o próprio dia', () => {
        const firstDay = new Date(2024, 5, 1); // Jun 1
        const result = getCurrentPeriodStart('monthly', firstDay);
        expect(result.getDate()).toBe(1);
        expect(result.getMonth()).toBe(5);
    });

    test('sempre define hora como meia-noite (00:00:00.000)', () => {
        const d = new Date(2024, 0, 10, 15, 30, 45, 999);
        const result = getCurrentPeriodStart('weekly', d);
        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
    });
});

// ─── computeScores ──────────────────────────────────────────────────────────

describe('computeScores', () => {
    test('ordena membros por pontos decrescente', () => {
        const house = makeHouse({
            logs: [
                { id: 'l1', taskId: 't2', memberId: 'u1', completedAt: '2024-01-14T10:00:00.000Z' }, // Alice: 20
                { id: 'l2', taskId: 't1', memberId: 'u2', completedAt: '2024-01-14T10:00:00.000Z' }, // Bob: 10
            ],
        });
        const scores = computeScores(house);
        expect(scores[0].member.id).toBe('u1');
        expect(scores[0].points).toBe(20);
        expect(scores[1].member.id).toBe('u2');
        expect(scores[1].points).toBe(10);
    });

    test('membro sem logs tem 0 pontos e 0 tarefas', () => {
        const scores = computeScores(makeHouse());
        expect(scores.every((s) => s.points === 0)).toBe(true);
        expect(scores.every((s) => s.completedTasks === 0)).toBe(true);
    });

    test('não contamina pontos entre membros', () => {
        const house = makeHouse({
            logs: [{ id: 'l1', taskId: 't1', memberId: 'u1', completedAt: '2024-01-14T10:00:00.000Z' }],
        });
        const bob = computeScores(house).find((s) => s.member.id === 'u2')!;
        expect(bob.points).toBe(0);
        expect(bob.completedTasks).toBe(0);
    });

    test('acumula pontos de múltiplos logs do mesmo membro', () => {
        const house = makeHouse({
            logs: [
                { id: 'l1', taskId: 't1', memberId: 'u1', completedAt: '2024-01-14T10:00:00.000Z' }, // 10
                { id: 'l2', taskId: 't2', memberId: 'u1', completedAt: '2024-01-15T10:00:00.000Z' }, // 20
            ],
        });
        const alice = computeScores(house).find((s) => s.member.id === 'u1')!;
        expect(alice.points).toBe(30);
        expect(alice.completedTasks).toBe(2);
    });

    test('empate: ambos os membros aparecem com mesma pontuação', () => {
        const house = makeHouse({
            logs: [
                { id: 'l1', taskId: 't1', memberId: 'u1', completedAt: '2024-01-14T10:00:00.000Z' }, // 10
                { id: 'l2', taskId: 't1', memberId: 'u2', completedAt: '2024-01-14T10:00:00.000Z' }, // 10
            ],
        });
        const scores = computeScores(house);
        expect(scores).toHaveLength(2);
        expect(scores[0].points).toBe(10);
        expect(scores[1].points).toBe(10);
    });

    test('log para tarefa deletada conta 0 pontos (não estoura)', () => {
        const house = makeHouse({
            logs: [{ id: 'l1', taskId: 'task-deletada', memberId: 'u1', completedAt: '2024-01-14T10:00:00.000Z' }],
        });
        const alice = computeScores(house).find((s) => s.member.id === 'u1')!;
        expect(alice.points).toBe(0);
        // mas completedTasks conta o log mesmo sem tarefa encontrada
        expect(alice.completedTasks).toBe(1);
    });

    test('inclui todos os membros mesmo sem logs', () => {
        const scores = computeScores(makeHouse());
        expect(scores).toHaveLength(2);
    });
});

// ─── computePeriodScores ────────────────────────────────────────────────────

describe('computePeriodScores', () => {
    test('retorna um score por membro', () => {
        const scores = computePeriodScores(makeHouse());
        expect(scores).toHaveLength(2);
    });

    test('score contém memberId e memberName corretos', () => {
        const scores = computePeriodScores(makeHouse());
        expect(scores[0]).toMatchObject({ memberId: 'u1', memberName: 'Alice' });
        expect(scores[1]).toMatchObject({ memberId: 'u2', memberName: 'Bob' });
    });

    test('pontos calculados corretamente', () => {
        const house = makeHouse({
            logs: [{ id: 'l1', taskId: 't2', memberId: 'u1', completedAt: '2024-01-14T10:00:00.000Z' }], // 20
        });
        const alice = computePeriodScores(house).find((s) => s.memberId === 'u1')!;
        expect(alice.points).toBe(20);
    });
});

// ─── checkAndResetPeriod ────────────────────────────────────────────────────

describe('checkAndResetPeriod', () => {
    // Data fixa: quarta Jan 17, 2024
    // Semana atual começa no domingo Jan 14, 2024
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date(2024, 0, 17));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("retorna 'none' quando período ainda não expirou", () => {
        const house = makeHouse({ periodStart: new Date(2024, 0, 14).toISOString() });
        expect(checkAndResetPeriod(house).type).toBe('none');
    });

    test("retorna 'none' quando periodStart é hoje mesmo", () => {
        const house = makeHouse({ periodStart: new Date(2024, 0, 17).toISOString() });
        // hoje está dentro do período (periodStart >= currentPeriodStart Jan 14)
        expect(checkAndResetPeriod(house).type).toBe('none');
    });

    test("retorna 'init' quando casa não tem periodStart", () => {
        const house = makeHouse({ periodStart: undefined as unknown as string });
        const result = checkAndResetPeriod(house);
        expect(result.type).toBe('init');
    });

    test("'init' popula periodStart com a data atual do período", () => {
        const house = makeHouse({ periodStart: undefined as unknown as string });
        const result = checkAndResetPeriod(house);
        if (result.type === 'init') {
            expect(result.house.periodStart).toBeTruthy();
            expect(new Date(result.house.periodStart).toString()).not.toBe('Invalid Date');
        }
    });

    test("retorna 'reset' quando período expirou", () => {
        const house = makeHouse({ periodStart: new Date(2023, 0, 1).toISOString() });
        expect(checkAndResetPeriod(house).type).toBe('reset');
    });

    test("reset: zera os logs", () => {
        const house = makeHouse({
            periodStart: new Date(2023, 0, 1).toISOString(),
            logs: [{ id: 'l1', taskId: 't1', memberId: 'u1', completedAt: '2023-01-02T00:00:00.000Z' }],
        });
        const result = checkAndResetPeriod(house);
        if (result.type === 'reset') {
            expect(result.house.logs).toEqual([]);
        } else {
            fail('esperado reset');
        }
    });

    test("reset: preserva tarefas", () => {
        const house = makeHouse({ periodStart: new Date(2023, 0, 1).toISOString() });
        const result = checkAndResetPeriod(house);
        if (result.type === 'reset') {
            expect(result.house.tasks).toEqual(house.tasks);
        }
    });

    test("reset: preserva membros", () => {
        const house = makeHouse({ periodStart: new Date(2023, 0, 1).toISOString() });
        const result = checkAndResetPeriod(house);
        if (result.type === 'reset') {
            expect(result.house.members).toEqual(house.members);
        }
    });

    test("reset: cria registro no histórico", () => {
        const house = makeHouse({ periodStart: new Date(2023, 0, 1).toISOString() });
        const result = checkAndResetPeriod(house);
        if (result.type === 'reset') {
            expect(result.house.history).toHaveLength(1);
        }
    });

    test("reset: histórico tem scores corretos", () => {
        const house = makeHouse({
            periodStart: new Date(2023, 0, 1).toISOString(),
            logs: [{ id: 'l1', taskId: 't1', memberId: 'u1', completedAt: '2023-01-02T00:00:00.000Z' }], // Alice: 10
        });
        const result = checkAndResetPeriod(house);
        if (result.type === 'reset') {
            const record = result.house.history[0];
            const alice = record.scores.find((s) => s.memberId === 'u1')!;
            expect(alice.points).toBe(10);
            expect(alice.completedTasks).toBe(1);
        }
    });

    test("reset: periodStart do registro é o periodStart anterior", () => {
        const oldStart = new Date(2023, 0, 1).toISOString();
        const house = makeHouse({ periodStart: oldStart });
        const result = checkAndResetPeriod(house);
        if (result.type === 'reset') {
            expect(result.house.history[0].periodStart).toBe(oldStart);
        }
    });

    test("reset: atualiza periodStart para o início do período atual", () => {
        const house = makeHouse({ periodStart: new Date(2023, 0, 1).toISOString() });
        const result = checkAndResetPeriod(house);
        if (result.type === 'reset') {
            const newStart = new Date(result.house.periodStart);
            // Quarta Jan 17 → semana começa domingo Jan 14
            expect(newStart.getDate()).toBe(14);
            expect(newStart.getMonth()).toBe(0);
            expect(newStart.getFullYear()).toBe(2024);
        }
    });

    test("reset: não duplica entrada no histórico já arquivada", () => {
        const oldStart = new Date(2023, 0, 1).toISOString();
        const house = makeHouse({
            periodStart: oldStart,
            history: [{ periodStart: oldStart, periodEnd: '2023-01-07T00:00:00.000Z', scores: [] }],
        });
        const result = checkAndResetPeriod(house);
        if (result.type === 'reset') {
            expect(result.house.history).toHaveLength(1);
        }
    });

    test("reset: acumula no histórico existente sem sobrescrever", () => {
        const previousRecord = {
            periodStart: new Date(2022, 0, 1).toISOString(),
            periodEnd: new Date(2022, 0, 7).toISOString(),
            scores: [],
        };
        const house = makeHouse({
            periodStart: new Date(2023, 0, 1).toISOString(),
            history: [previousRecord],
        });
        const result = checkAndResetPeriod(house);
        if (result.type === 'reset') {
            expect(result.house.history).toHaveLength(2);
            expect(result.house.history[0]).toEqual(previousRecord);
        }
    });
});

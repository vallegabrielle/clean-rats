import { formatTime, formatDateLabel, initials, getDateKey } from '../utils';

// Data fixa: segunda-feira, Jan 15, 2024, meio-dia (hora local)
const NOW = new Date(2024, 0, 15, 12, 0, 0);

beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
});

afterEach(() => {
    jest.useRealTimers();
});

// ─── formatTime ─────────────────────────────────────────────────────────────

describe('formatTime', () => {
    test('hoje → começa com "Hoje às"', () => {
        const iso = new Date(2024, 0, 15, 9, 30, 0).toISOString();
        expect(formatTime(iso)).toMatch(/^Hoje às/);
    });

    test('ontem → começa com "Ontem às"', () => {
        const iso = new Date(2024, 0, 14, 9, 30, 0).toISOString();
        expect(formatTime(iso)).toMatch(/^Ontem às/);
    });

    test('data mais antiga → não começa com "Hoje" nem "Ontem"', () => {
        const iso = new Date(2024, 0, 1, 9, 30, 0).toISOString();
        const result = formatTime(iso);
        expect(result).not.toMatch(/^Hoje/);
        expect(result).not.toMatch(/^Ontem/);
    });

    test('inclui horário no resultado', () => {
        const iso = new Date(2024, 0, 15, 14, 30, 0).toISOString();
        expect(formatTime(iso)).toContain('14:30');
    });

    test('hoje de manhã cedo ainda é "Hoje"', () => {
        const iso = new Date(2024, 0, 15, 0, 1, 0).toISOString();
        expect(formatTime(iso)).toMatch(/^Hoje/);
    });

    test('dia antes de ontem não é "Ontem"', () => {
        const iso = new Date(2024, 0, 13, 10, 0, 0).toISOString();
        expect(formatTime(iso)).not.toMatch(/^Ontem/);
    });

    test('resultado contém "às" como separador', () => {
        const iso = new Date(2024, 0, 15, 10, 0, 0).toISOString();
        expect(formatTime(iso)).toContain(' às ');
    });
});

// ─── formatDateLabel ─────────────────────────────────────────────────────────

describe('formatDateLabel', () => {
    test('hoje → "Hoje"', () => {
        const iso = new Date(2024, 0, 15, 8, 0, 0).toISOString();
        expect(formatDateLabel(iso)).toBe('Hoje');
    });

    test('ontem → "Ontem"', () => {
        const iso = new Date(2024, 0, 14, 8, 0, 0).toISOString();
        expect(formatDateLabel(iso)).toBe('Ontem');
    });

    test('hoje à meia-noite → "Hoje"', () => {
        const iso = new Date(2024, 0, 15, 0, 0, 0).toISOString();
        expect(formatDateLabel(iso)).toBe('Hoje');
    });

    test('mesmo ano mas não hoje nem ontem → não retorna "Hoje" nem "Ontem"', () => {
        const iso = new Date(2024, 0, 1, 8, 0, 0).toISOString();
        const result = formatDateLabel(iso);
        expect(result).not.toBe('Hoje');
        expect(result).not.toBe('Ontem');
        expect(result).toBeTruthy();
    });

    test('ano passado → contém o ano no resultado', () => {
        const iso = new Date(2022, 5, 10, 8, 0, 0).toISOString();
        expect(formatDateLabel(iso)).toContain('2022');
    });

    test('ano atual → NÃO contém o ano no resultado', () => {
        const iso = new Date(2024, 0, 1, 8, 0, 0).toISOString();
        expect(formatDateLabel(iso)).not.toContain('2024');
    });
});

// ─── initials ────────────────────────────────────────────────────────────────

describe('initials', () => {
    test('duas palavras → inicial de cada', () => {
        expect(initials('João Silva')).toBe('JS');
    });

    test('uma palavra → apenas a primeira letra', () => {
        expect(initials('Ana')).toBe('A');
    });

    test('três palavras → somente as duas primeiras iniciais', () => {
        expect(initials('Ana Maria Silva')).toBe('AM');
    });

    test('resultado é sempre maiúsculo', () => {
        expect(initials('alice bob')).toBe('AB');
    });

    test('nome com letras minúsculas → inicial maiúscula', () => {
        expect(initials('carlos eduardo')).toBe('CE');
    });
});

// ─── getDateKey ──────────────────────────────────────────────────────────────

describe('getDateKey', () => {
    test('mesma data em horários diferentes → mesma chave', () => {
        const morning = new Date(2024, 0, 15, 8, 0, 0).toISOString();
        const night = new Date(2024, 0, 15, 23, 59, 0).toISOString();
        expect(getDateKey(morning)).toBe(getDateKey(night));
    });

    test('dias diferentes → chaves diferentes', () => {
        const day1 = new Date(2024, 0, 15).toISOString();
        const day2 = new Date(2024, 0, 16).toISOString();
        expect(getDateKey(day1)).not.toBe(getDateKey(day2));
    });

    test('meses diferentes → chaves diferentes', () => {
        const jan = new Date(2024, 0, 15).toISOString();
        const feb = new Date(2024, 1, 15).toISOString();
        expect(getDateKey(jan)).not.toBe(getDateKey(feb));
    });

    test('anos diferentes → chaves diferentes', () => {
        const y2023 = new Date(2023, 0, 15).toISOString();
        const y2024 = new Date(2024, 0, 15).toISOString();
        expect(getDateKey(y2023)).not.toBe(getDateKey(y2024));
    });

    test('retorna uma string não-vazia', () => {
        const iso = new Date(2024, 0, 15).toISOString();
        expect(getDateKey(iso)).toBeTruthy();
    });
});

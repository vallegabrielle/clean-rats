import {
    saveHouses,
    loadHouses,
    saveActiveHouseId,
    loadActiveHouseId,
    clearAllData,
} from '../storage';
import { House } from '../../types';

// Mock em memória do AsyncStorage
const store: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
        return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
        delete store[key];
        return Promise.resolve();
    }),
    multiRemove: jest.fn((keys: string[]) => {
        keys.forEach((k) => delete store[k]);
        return Promise.resolve();
    }),
}));

function makeHouse(id: string, overrides: Partial<House> = {}): House {
    return {
        id,
        name: `House ${id}`,
        code: 'ABC123',
        period: 'weekly',
        memberIds: ['u1'],
        members: [{ id: 'u1', name: 'Alice' }],
        tasks: [],
        logs: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        periodStart: '2024-01-01T00:00:00.000Z',
        history: [],
        ...overrides,
    };
}

beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    jest.restoreAllMocks();
});

// ─── saveHouses / loadHouses ─────────────────────────────────────────────────

describe('saveHouses / loadHouses', () => {
    test('round-trip: salva e carrega os mesmos dados', async () => {
        const houses = [makeHouse('h1'), makeHouse('h2')];
        await saveHouses(houses);
        const loaded = await loadHouses();
        expect(loaded).toHaveLength(2);
        expect(loaded[0].id).toBe('h1');
        expect(loaded[1].id).toBe('h2');
    });

    test('dados salvos são idênticos aos carregados', async () => {
        const house = makeHouse('h1');
        await saveHouses([house]);
        const [loaded] = await loadHouses();
        expect(loaded).toEqual(house);
    });

    test('loadHouses retorna [] quando storage está vazio', async () => {
        expect(await loadHouses()).toEqual([]);
    });

    test('loadHouses retorna [] com JSON corrompido', async () => {
        store['@clean_rats:houses'] = 'não é json {{{';
        expect(await loadHouses()).toEqual([]);
    });

    test('loadHouses retorna [] quando dado não é array', async () => {
        store['@clean_rats:houses'] = JSON.stringify({ id: 'não-é-array' });
        expect(await loadHouses()).toEqual([]);
    });

    test('loadHouses filtra entradas que faltam campos obrigatórios', async () => {
        const valid = makeHouse('h1');
        const invalid = { id: 'h2', name: 'sem outros campos' };
        store['@clean_rats:houses'] = JSON.stringify([valid, invalid]);
        const result = await loadHouses();
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('h1');
    });

    test('loadHouses filtra entry com period inválido', async () => {
        const invalid = { ...makeHouse('h1'), period: 'daily' };
        store['@clean_rats:houses'] = JSON.stringify([invalid]);
        expect(await loadHouses()).toEqual([]);
    });

    test('loadHouses filtra entry com members não sendo array', async () => {
        const invalid = { ...makeHouse('h1'), members: 'não-array' };
        store['@clean_rats:houses'] = JSON.stringify([invalid]);
        expect(await loadHouses()).toEqual([]);
    });

    test('loadHouses filtra entry sem id', async () => {
        const { id: _id, ...noId } = makeHouse('h1');
        store['@clean_rats:houses'] = JSON.stringify([noId]);
        expect(await loadHouses()).toEqual([]);
    });

    test('salvar lista vazia persiste e carrega como []', async () => {
        await saveHouses([makeHouse('h1')]);
        await saveHouses([]);
        expect(await loadHouses()).toEqual([]);
    });
});

// ─── saveActiveHouseId / loadActiveHouseId ───────────────────────────────────

describe('saveActiveHouseId / loadActiveHouseId', () => {
    test('round-trip: salva e carrega o id', async () => {
        await saveActiveHouseId('house-123');
        expect(await loadActiveHouseId()).toBe('house-123');
    });

    test('loadActiveHouseId retorna null quando não há id salvo', async () => {
        expect(await loadActiveHouseId()).toBeNull();
    });

    test('saveActiveHouseId(null) remove a chave', async () => {
        await saveActiveHouseId('house-123');
        await saveActiveHouseId(null);
        expect(await loadActiveHouseId()).toBeNull();
    });

    test('sobrescreve id anterior', async () => {
        await saveActiveHouseId('house-1');
        await saveActiveHouseId('house-2');
        expect(await loadActiveHouseId()).toBe('house-2');
    });
});

// ─── clearAllData ────────────────────────────────────────────────────────────

describe('clearAllData', () => {
    test('remove casas do storage', async () => {
        await saveHouses([makeHouse('h1')]);
        await clearAllData();
        expect(await loadHouses()).toEqual([]);
    });

    test('remove activeHouseId do storage', async () => {
        await saveActiveHouseId('h1');
        await clearAllData();
        expect(await loadActiveHouseId()).toBeNull();
    });

    test('remove os dois simultaneamente', async () => {
        await saveHouses([makeHouse('h1')]);
        await saveActiveHouseId('h1');
        await clearAllData();
        expect(await loadHouses()).toEqual([]);
        expect(await loadActiveHouseId()).toBeNull();
    });
});

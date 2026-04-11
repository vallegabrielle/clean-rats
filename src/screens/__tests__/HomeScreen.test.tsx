/**
 * HomeScreen — testes 113–120
 */

import React from 'react';
import { create, act, ReactTestRenderer } from 'react-test-renderer';
import HomeScreen from '../HomeScreen';
import { useHouseStore } from '../../contexts/HouseContext';
import { useAuth } from '../../contexts/AuthContext';
import { computeScores } from '../../services/period';
import { HouseSettingsModal } from '../../components/HouseSettingsModal';
import { useNavigation } from '@react-navigation/native';
import { House, TaskLog } from '../../types';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// App só exporta um tipo (RootStackParamList), não precisa de implementação real
jest.mock('../../../App', () => ({}));

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({ children }: any) =>
        require('react').createElement(require('react-native').View, null, children),
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('@react-navigation/native', () => ({
    useNavigation: jest.fn(() => ({ navigate: jest.fn(), goBack: jest.fn() })),
}));

jest.mock('../../contexts/HouseContext', () => ({
    useHouseStore: jest.fn(),
    selectActiveHouse: (state: any) =>
        state?.houses?.find((h: any) => h.id === state.activeHouseId) ?? null,
}));

jest.mock('../../contexts/AuthContext', () => ({
    useAuth: jest.fn(() => ({ user: { uid: 'user-1', displayName: 'Alice' } })),
}));

jest.mock('../../services/period', () => ({
    computeScores: jest.fn(() => []),
}));

// Swipeable expõe renderRightActions imediatamente — necessário para teste 120
jest.mock('react-native-gesture-handler', () => ({
    Swipeable: ({ children, renderRightActions }: any) =>
        require('react').createElement(
            require('react-native').View,
            null,
            children,
            renderRightActions?.(),
        ),
}));

// HouseSettingsModal como jest.fn para inspecionar props — necessário para teste 116
jest.mock('../../components/HouseSettingsModal', () => ({
    HouseSettingsModal: jest.fn(() => null),
}));

jest.mock('../../components/SideMenu', () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock('../../components/LogActivityModal', () => ({
    LogActivityModal: () => null,
}));

jest.mock('../../components/EmptyState', () => ({
    EmptyState: ({ text }: any) =>
        require('react').createElement(require('react-native').Text, null, text),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function allText(node: any): string[] {
    if (!node) return [];
    if (typeof node === 'string') return [node];
    if (typeof node === 'number') return [String(node)];
    if (Array.isArray(node)) return node.flatMap(allText);
    if (node.children) return allText(node.children);
    return [];
}

function hasText(node: any, text: string): boolean {
    return allText(node).some((t) => t.includes(text));
}

/** Encontra o ancestral mais próximo com onPress a partir de um nó folha. */
function findPressableAncestor(node: any): any {
    let current = node?.parent;
    while (current) {
        if (typeof current.props?.onPress === 'function') return current;
        current = current.parent;
    }
    return null;
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString();
const YESTERDAY = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString();
})();

function makeHouse(overrides: Partial<House> = {}): House {
    return {
        id: 'house-1',
        name: 'Toca dos Ratos',
        code: 'ABC123',
        period: 'weekly',
        memberIds: ['user-1'],
        members: [{ id: 'user-1', name: 'Alice' }],
        tasks: [{ id: 'task-1', name: 'Lavar louça', points: 10, isDefault: true }],
        createdAt: '2024-01-01T00:00:00.000Z',
        periodStart: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
        history: [],
        pendingRequests: [],
        pendingMemberIds: [],
        ...overrides,
    };
}

function setupStore(house: House | null, logs: TaskLog[] = []) {
    const state = {
        houses: house ? [house] : [],
        activeHouseId: house ? house.id : null,
        loadingHouses: false,
        logs,
        removeLogFromHouse: jest.fn(),
    };
    jest.mocked(useHouseStore).mockImplementation((selector: any) =>
        selector ? selector(state) : state,
    );
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(computeScores).mockReturnValue([]);
    jest.mocked(useNavigation).mockReturnValue({
        navigate: jest.fn(),
        goBack: jest.fn(),
    } as any);
    jest.mocked(useAuth).mockReturnValue({
        user: { uid: 'user-1', displayName: 'Alice' },
    } as any);
});

function render(house: House | null = makeHouse(), logs: TaskLog[] = []): ReactTestRenderer {
    setupStore(house, logs);
    let renderer!: ReactTestRenderer;
    act(() => {
        renderer = create(React.createElement(HomeScreen));
    });
    return renderer;
}

// ─── Badge de solicitações pendentes ─────────────────────────────────────────

// 113
test('badge aparece quando pendingRequests.length > 0', () => {
    const house = makeHouse({
        pendingRequests: [
            { userId: 'u2', name: 'Bob', requestedAt: TODAY },
        ],
    });
    const tree = render(house).toJSON();
    expect(hasText(tree, '👥')).toBe(true);
});

// 114
test('badge mostra o número correto de solicitações', () => {
    const house = makeHouse({
        pendingRequests: [
            { userId: 'u2', name: 'Bob', requestedAt: TODAY },
            { userId: 'u3', name: 'Carol', requestedAt: TODAY },
        ],
    });
    const texts = allText(render(house).toJSON());
    // O badge exibe o count (número 2)
    expect(texts.some((t) => t === '2')).toBe(true);
    expect(hasText(render(house).toJSON(), '👥')).toBe(true);
});

// 115
test('badge some quando não há solicitações pendentes', () => {
    const house = makeHouse({ pendingRequests: [] });
    const tree = render(house).toJSON();
    expect(hasText(tree, '👥')).toBe(false);
});

// 116
test('pressionar badge abre HouseSettingsModal com openToRequests=true', () => {
    const house = makeHouse({
        pendingRequests: [{ userId: 'u2', name: 'Bob', requestedAt: TODAY }],
    });
    const renderer = render(house);

    // Encontra o Text que contém '👥' e sobe até o TouchableOpacity pai
    const emojiNode = renderer.root.findAll(
        (node) => node.props.children === '👥',
    )[0];
    const badgeBtn = findPressableAncestor(emojiNode);
    expect(badgeBtn).toBeTruthy();

    // Limpa chamadas do render inicial
    jest.mocked(HouseSettingsModal).mockClear();

    act(() => {
        badgeBtn.props.onPress();
    });

    const lastProps = jest.mocked(HouseSettingsModal).mock.calls.at(-1)?.[0] as any;
    expect(lastProps?.visible).toBe(true);
    expect(lastProps?.openToRequests).toBe(true);
});

// ─── Progress bar ─────────────────────────────────────────────────────────────

// 117
test('progress bar do período é renderizada', () => {
    const house = makeHouse({ period: 'weekly' });
    const tree = render(house).toJSON();
    expect(hasText(tree, 'Período')).toBe(true);
    expect(hasText(tree, 'Semanal')).toBe(true);
});

// ─── Agrupamento de logs por data ─────────────────────────────────────────────

// 118
test('logs de hoje aparecem com label "Hoje"', () => {
    const house = makeHouse();
    const logs: TaskLog[] = [
        { id: 'log-1', taskId: 'task-1', memberId: 'user-1', completedAt: TODAY },
    ];
    const tree = render(house, logs).toJSON();
    expect(hasText(tree, 'Hoje')).toBe(true);
});

// 119
test('logs de ontem aparecem com label "Ontem"', () => {
    const house = makeHouse();
    const logs: TaskLog[] = [
        { id: 'log-1', taskId: 'task-1', memberId: 'user-1', completedAt: YESTERDAY },
    ];
    const tree = render(house, logs).toJSON();
    expect(hasText(tree, 'Ontem')).toBe(true);
});

// ─── Swipe de atividade própria ───────────────────────────────────────────────

// 120
test('atividade própria exibe botões de editar (✎) e deletar (✕) no swipe', () => {
    const house = makeHouse();
    const logs: TaskLog[] = [
        { id: 'log-1', taskId: 'task-1', memberId: 'user-1', completedAt: TODAY },
    ];
    // Usuário logado = user-1, log.memberId = user-1 → isOwner = true
    jest.mocked(useAuth).mockReturnValue({
        user: { uid: 'user-1', displayName: 'Alice' },
    } as any);

    const tree = render(house, logs).toJSON();
    // O mock do Swipeable chama renderRightActions() inline
    // Se isOwner=true, os botões ✎ e ✕ ficam visíveis na árvore
    expect(hasText(tree, '✎')).toBe(true);
    expect(hasText(tree, '✕')).toBe(true);
});

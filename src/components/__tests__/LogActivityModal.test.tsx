/**
 * LogActivityModal — log, edição, tarefa personalizada
 */

import React from 'react';
import { create, act, ReactTestRenderer } from 'react-test-renderer';
import { LogActivityModal } from '../LogActivityModal';
import { useHouseStore } from '../../contexts/HouseContext';
import { useAuth } from '../../contexts/AuthContext';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: jest.fn(() => ({ bottom: 0, top: 0, left: 0, right: 0 })),
}));

jest.mock('../../hooks/useSheetDismiss', () => ({
    useSheetDismiss: jest.fn(() => ({ translateY: 0, panHandlers: {} })),
}));

jest.mock('../../contexts/HouseContext', () => ({
    useHouseStore: jest.fn(),
    selectActiveHouse: (s: any) =>
        s?.houses?.find((h: any) => h.id === s.activeHouseId) ?? null,
}));

jest.mock('../../contexts/AuthContext', () => ({
    useAuth: jest.fn(),
}));

jest.mock('react-native-google-mobile-ads', () => ({
    InterstitialAd: {
        createForAdRequest: jest.fn(() => ({
            addAdEventListener: jest.fn(() => jest.fn()),
            load: jest.fn(),
            show: jest.fn(),
        })),
    },
    AdEventType: { LOADED: 'loaded', CLOSED: 'closed', ERROR: 'error' },
    TestIds: {
        INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
        ADAPTIVE_BANNER: 'ca-app-pub-3940256099942544/2934735716',
    },
}));

jest.mock('../Toast', () => ({
    showToast: jest.fn(),
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

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockLogTask = jest.fn(() => Promise.resolve());
const mockUpdateLog = jest.fn(() => Promise.resolve());
const mockAddTaskAndLog = jest.fn(() => Promise.resolve());
const mockOnClose = jest.fn();

const house = {
    id: 'house-1',
    name: 'Toca',
    code: 'ABC',
    period: 'weekly' as const,
    memberIds: ['u1'],
    members: [{ id: 'u1', name: 'Alice' }],
    tasks: [
        { id: 'task-1', name: 'Lavar louça', points: 10, isDefault: true },
        { id: 'task-2', name: 'Varrer chão', points: 15, isDefault: true },
    ],
    logs: [
        { id: 'log-1', taskId: 'task-1', memberId: 'u1', completedAt: new Date().toISOString() },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    periodStart: new Date().toISOString(),
    history: [],
    pendingRequests: [],
    pendingMemberIds: [],
};

function setupStore() {
    const state = {
        houses: [house],
        activeHouseId: 'house-1',
        logs: house.logs,
        logTaskInHouse: mockLogTask,
        updateLogInHouse: mockUpdateLog,
        addTaskAndLogInHouse: mockAddTaskAndLog,
    };
    jest.mocked(useHouseStore).mockImplementation((selector: any) =>
        selector ? selector(state) : state,
    );
    jest.mocked(useAuth).mockReturnValue({ user: { uid: 'u1' } } as any);
}

beforeEach(() => {
    jest.clearAllMocks();
    setupStore();
});

function render(props: Partial<React.ComponentProps<typeof LogActivityModal>> = {}): ReactTestRenderer {
    let renderer!: ReactTestRenderer;
    act(() => {
        renderer = create(
            React.createElement(LogActivityModal, {
                visible: true,
                onClose: mockOnClose,
                ...props,
            }),
        );
    });
    return renderer;
}

// ─── Testes ──────────────────────────────────────────────────────────────────

test('título "Registrar atividade" quando sem editingLogId', () => {
    expect(hasText(render().toJSON(), 'Registrar atividade')).toBe(true);
});

test('título "Editar atividade" quando com editingLogId', () => {
    expect(hasText(render({ editingLogId: 'log-1' }).toJSON(), 'Editar atividade')).toBe(true);
});

test('lista todas as tarefas da casa', () => {
    const tree = render().toJSON();
    expect(hasText(tree, 'Lavar louça')).toBe(true);
    expect(hasText(tree, 'Varrer chão')).toBe(true);
});

test('selecionar tarefa chama logTaskInHouse no modo log', async () => {
    const renderer = render();

    const taskText = renderer.root.find(
        (n) => n.type === 'Text' && n.props.children === 'Lavar louça',
    );
    let taskBtn = taskText?.parent;
    while (taskBtn && typeof taskBtn.props?.onPress !== 'function') taskBtn = taskBtn.parent;

    await act(async () => { taskBtn!.props.onPress(); });

    expect(mockLogTask).toHaveBeenCalledWith('task-1', expect.any(String));
    expect(mockUpdateLog).not.toHaveBeenCalled();
});

test('selecionar tarefa chama updateLogInHouse no modo edição', async () => {
    const renderer = render({ editingLogId: 'log-1' });

    const taskText = renderer.root.find(
        (n) => n.type === 'Text' && n.props.children === 'Varrer chão',
    );
    let taskBtn = taskText?.parent;
    while (taskBtn && typeof taskBtn.props?.onPress !== 'function') taskBtn = taskBtn.parent;

    await act(async () => { taskBtn!.props.onPress(); });

    expect(mockUpdateLog).toHaveBeenCalledWith('log-1', 'task-2');
    expect(mockLogTask).not.toHaveBeenCalled();
});

test('botão "+ Tarefa personalizada" visível no modo log e abre CustomTaskForm', () => {
    const renderer = render();
    expect(hasText(renderer.toJSON(), '+ Tarefa personalizada')).toBe(true);

    const customText = renderer.root.find(
        (n) => n.type === 'Text' && n.props.children === '+ Tarefa personalizada',
    );
    let customBtn = customText?.parent;
    while (customBtn && typeof customBtn.props?.onPress !== 'function') customBtn = customBtn.parent;

    act(() => { customBtn!.props.onPress(); });

    // CustomTaskForm abre — verifica pelo placeholder "Nome da tarefa"
    const input = renderer.root.find(
        (n) => n.type === 'TextInput' && n.props.placeholder === 'Nome da tarefa',
    );
    expect(input).toBeTruthy();
});

test('botão "+ Tarefa personalizada" oculto no modo edição', () => {
    const tree = render({ editingLogId: 'log-1' }).toJSON();
    expect(hasText(tree, '+ Tarefa personalizada')).toBe(false);
});

test('submit de tarefa personalizada chama addTaskAndLogInHouse', async () => {
    const renderer = render();

    // Abre o formulário custom
    const customText = renderer.root.find(
        (n) => n.type === 'Text' && n.props.children === '+ Tarefa personalizada',
    );
    let customBtn = customText?.parent;
    while (customBtn && typeof customBtn.props?.onPress !== 'function') customBtn = customBtn.parent;
    act(() => { customBtn!.props.onPress(); });

    // Preenche nome e pontos
    const nameInput = renderer.root.find(
        (n) => n.type === 'TextInput' && n.props.placeholder === 'Nome da tarefa',
    );
    const pointsInput = renderer.root.find(
        (n) => n.type === 'TextInput' && n.props.placeholder === 'Pontos',
    );
    act(() => {
        nameInput.props.onChangeText('Passar pano');
        pointsInput.props.onChangeText('5');
    });

    // Pressiona "Registrar"
    const registrarText = renderer.root.find(
        (n) => n.type === 'Text' && n.props.children === 'Registrar',
    );
    let registrarBtn = registrarText?.parent;
    while (registrarBtn && typeof registrarBtn.props?.onPress !== 'function') registrarBtn = registrarBtn.parent;

    await act(async () => { registrarBtn!.props.onPress(); });

    expect(mockAddTaskAndLog).toHaveBeenCalledWith('Passar pano', 5, expect.any(String));
});

/**
 * TasksScreen — testes 132–135
 */

import React from 'react';
import { create, act, ReactTestRenderer } from 'react-test-renderer';
import TasksScreen from '../TasksScreen';
import { useHouseStore } from '../../contexts/HouseContext';
import { Alert } from 'react-native';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({ children }: any) =>
        require('react').createElement(require('react-native').View, null, children),
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('react-native-gesture-handler', () => ({
    Swipeable: ({ children, renderRightActions }: any) =>
        require('react').createElement(
            require('react-native').View,
            null,
            children,
            renderRightActions?.(),
        ),
}));

jest.mock('../../contexts/HouseContext', () => ({
    useHouseStore: jest.fn(),
    selectActiveHouse: (state: any) =>
        state?.houses?.find((h: any) => h.id === state.activeHouseId) ?? null,
}));

jest.mock('../../components/ScreenHeader', () => ({
    ScreenHeader: () => null,
}));

jest.mock('../../components/EmptyState', () => ({
    EmptyState: ({ text }: any) =>
        require('react').createElement(require('react-native').Text, null, text),
}));

jest.mock('../../components/Toast', () => ({
    showToast: jest.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function allText(node: any): string[] {
    if (!node) return [];
    if (typeof node === 'string') return [node];
    if (typeof node === 'number') return [String(node)]
    if (Array.isArray(node)) return node.flatMap(allText);
    if (node.children) return allText(node.children);
    return [];
}

function hasText(node: any, text: string): boolean {
    return allText(node).some((t) => t.includes(text));
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockRemoveTask = jest.fn();
const mockUpdateTask = jest.fn();
const mockAddTask = jest.fn();

const mockTasks = [
    { id: 'task-1', name: 'Lavar louça', points: 10, isDefault: true },
    { id: 'task-2', name: 'Varrer chão', points: 20, isDefault: false },
];

const mockState = {
    houses: [
        {
            id: 'house-1',
            name: 'Test House',
            code: 'ABC123',
            period: 'weekly' as const,
            memberIds: ['user-1'],
            members: [{ id: 'user-1', name: 'Alice' }],
            tasks: mockTasks,
            logs: [],
            createdAt: '2024-01-01T00:00:00.000Z',
            periodStart: new Date().toISOString(),
            history: [],
            pendingRequests: [],
            pendingMemberIds: [],
        },
    ],
    activeHouseId: 'house-1',
    loadingHouses: false,
    removeTaskFromHouse: mockRemoveTask,
    updateTaskInHouse: mockUpdateTask,
    addTaskToHouse: mockAddTask,
};

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useHouseStore).mockImplementation((selector: any) =>
        selector ? selector(mockState) : mockState,
    );
});

function render(): ReactTestRenderer {
    let renderer!: ReactTestRenderer;
    act(() => {
        renderer = create(React.createElement(TasksScreen));
    });
    return renderer;
}

// ─── Testes ──────────────────────────────────────────────────────────────────

// 132
test('lista todas as tarefas da casa com nome e pontos', () => {
    const tree = render().toJSON();
    expect(hasText(tree, 'Lavar louça')).toBe(true);
    expect(hasText(tree, 'Varrer chão')).toBe(true);
    expect(hasText(tree, '10')).toBe(true);
    expect(hasText(tree, '20')).toBe(true);
});

// 133
test('swipe exibe botões de editar (✎) e deletar (✕)', () => {
    const tree = render().toJSON();
    // Swipeable mock calls renderRightActions() immediately, exposing both buttons
    expect(hasText(tree, '✎')).toBe(true);
    expect(hasText(tree, '✕')).toBe(true);
});

// 134
test('pressionar deletar chama removeTaskFromHouse após confirmação', async () => {
    const renderer = render();

    // Capture Alert.alert calls
    const alertSpy = jest.spyOn(Alert, 'alert');

    // Find the first ✕ delete button and press it
    const deleteBtn = renderer.root.findAll(
        (node) => node.type === 'Text' && node.props.children === '✕',
    )[0];
    const pressable = (() => {
        let current = deleteBtn?.parent;
        while (current) {
            if (typeof current.props?.onPress === 'function') return current;
            current = current.parent;
        }
        return null;
    })();
    expect(pressable).toBeTruthy();

    act(() => { pressable!.props.onPress(); });

    // Alert should have been called
    expect(alertSpy).toHaveBeenCalled();

    // Trigger the confirm ("Excluir") button callback
    const alertButtons: any[] = alertSpy.mock.calls[0][2] as any[];
    const confirmBtn = alertButtons.find((b: any) => b.style === 'destructive');
    expect(confirmBtn).toBeTruthy();

    await act(async () => { await confirmBtn.onPress(); });

    expect(mockRemoveTask).toHaveBeenCalledWith('task-1');
});

// 135
test('pressionar editar substitui o card pelo TaskForm preenchido com dados da tarefa', () => {
    const renderer = render();

    // Find the first ✎ edit button and press it
    const editBtn = renderer.root.findAll(
        (node) => node.type === 'Text' && node.props.children === '✎',
    )[0];
    const pressable = (() => {
        let current = editBtn?.parent;
        while (current) {
            if (typeof current.props?.onPress === 'function') return current;
            current = current.parent;
        }
        return null;
    })();
    expect(pressable).toBeTruthy();

    act(() => { pressable!.props.onPress(); });

    // After pressing edit, TaskForm renders with initial.name = 'Lavar louça'
    // The TaskForm TextInput for name has value = initial.name
    const inputs = renderer.root.findAll(
        (node) => node.type === 'TextInput' && node.props.value === 'Lavar louça',
    );
    expect(inputs.length).toBeGreaterThan(0);
});

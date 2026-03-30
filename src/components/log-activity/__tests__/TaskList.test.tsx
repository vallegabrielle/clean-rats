/**
 * TaskList — listagem, seleção, estado atual, loading
 */

import React from 'react';
import { create, act, ReactTestRenderer } from 'react-test-renderer';
import { TaskList } from '../TaskList';

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

const tasks = [
    { id: 'task-1', name: 'Lavar louça', points: 10 },
    { id: 'task-2', name: 'Varrer chão', points: 15 },
];

// ─── Setup ───────────────────────────────────────────────────────────────────

const mockSelect = jest.fn();

beforeEach(() => { jest.clearAllMocks(); });

function render(props: Partial<React.ComponentProps<typeof TaskList>> = {}): ReactTestRenderer {
    let renderer!: ReactTestRenderer;
    act(() => {
        renderer = create(
            React.createElement(TaskList, {
                tasks,
                loadingId: null,
                onSelect: mockSelect,
                ...props,
            }),
        );
    });
    return renderer;
}

// ─── Testes ──────────────────────────────────────────────────────────────────

test('"Nenhuma tarefa cadastrada." quando lista vazia', () => {
    expect(hasText(render({ tasks: [] }).toJSON(), 'Nenhuma tarefa cadastrada.')).toBe(true);
});

test('renderiza o nome e pontos de cada tarefa', () => {
    const tree = render().toJSON();
    expect(hasText(tree, 'Lavar louça')).toBe(true);
    expect(hasText(tree, 'Varrer chão')).toBe(true);
    expect(hasText(tree, '10')).toBe(true);
    expect(hasText(tree, '15')).toBe(true);
});

test('pressionar tarefa chama onSelect com o taskId correto', () => {
    const renderer = render();
    const taskText = renderer.root.find(
        (n) => n.type === 'Text' && n.props.children === 'Lavar louça',
    );
    let btn = taskText?.parent;
    while (btn && typeof btn.props?.onPress !== 'function') btn = btn.parent;

    act(() => { btn!.props.onPress(); });

    expect(mockSelect).toHaveBeenCalledWith('task-1');
});

test('tarefa atual mostra label "selecionada"', () => {
    const tree = render({ currentTaskId: 'task-1' }).toJSON();
    expect(hasText(tree, 'selecionada')).toBe(true);
});

test('tarefa sem currentTaskId não mostra "selecionada"', () => {
    const tree = render().toJSON();
    expect(hasText(tree, 'selecionada')).toBe(false);
});

test('todas as tarefas desabilitadas quando loadingId não é null', () => {
    const renderer = render({ loadingId: 'task-1' });
    const pressables = renderer.root.findAll(
        (n) => typeof n.props.onPress === 'function' && 'disabled' in n.props,
    );
    expect(pressables.every((n) => n.props.disabled === true)).toBe(true);
});

test('mostra ActivityIndicator na tarefa em loading e pontos nas outras', () => {
    const renderer = render({ loadingId: 'task-1' });
    // task-1 tem spinner
    expect(renderer.root.findAll((n) => n.type === 'ActivityIndicator').length).toBe(1);
    // task-2 ainda mostra pontos
    expect(hasText(renderer.toJSON(), '15')).toBe(true);
});

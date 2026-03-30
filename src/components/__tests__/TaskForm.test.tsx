/**
 * TaskForm — validação e comportamento do formulário de tarefa
 */

import React from 'react';
import { create, act, ReactTestRenderer } from 'react-test-renderer';
import { TaskForm } from '../tasks/TaskForm';

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

// ─── Setup ───────────────────────────────────────────────────────────────────

const mockConfirm = jest.fn();
const mockCancel = jest.fn();

function render(props: Partial<React.ComponentProps<typeof TaskForm>> = {}): ReactTestRenderer {
    let renderer!: ReactTestRenderer;
    act(() => {
        renderer = create(
            React.createElement(TaskForm, {
                onConfirm: mockConfirm,
                onCancel: mockCancel,
                loading: false,
                ...props,
            }),
        );
    });
    return renderer;
}

function findNameInput(renderer: ReactTestRenderer) {
    return renderer.root.find(
        (n) => n.type === 'TextInput' && n.props.placeholder === 'Nome da tarefa',
    );
}

function findPointsInput(renderer: ReactTestRenderer) {
    return renderer.root.find(
        (n) => n.type === 'TextInput' && n.props.placeholder === 'Pontuação (máx. 1000)',
    );
}

function findPressableAncestor(node: any): any {
    let current = node?.parent;
    while (current) {
        if (typeof current.props?.onPress === 'function') return current;
        current = current.parent;
    }
    return null;
}

function findConfirmBtn(renderer: ReactTestRenderer) {
    const text = renderer.root.find(
        (n) => n.type === 'Text' && (n.props.children === 'Adicionar' || n.props.children === 'Salvar'),
    );
    return findPressableAncestor(text);
}

function findCancelBtn(renderer: ReactTestRenderer) {
    const text = renderer.root.find(
        (n) => n.type === 'Text' && n.props.children === 'Cancelar',
    );
    return findPressableAncestor(text);
}

beforeEach(() => { jest.clearAllMocks(); });

// ─── Testes ──────────────────────────────────────────────────────────────────

test('renderiza "Adicionar" quando sem initial', () => {
    expect(hasText(render().toJSON(), 'Adicionar')).toBe(true);
});

test('renderiza "Salvar" quando tem initial', () => {
    const renderer = render({ initial: { id: 't1', name: 'Lavar', points: '10' } });
    expect(hasText(renderer.toJSON(), 'Salvar')).toBe(true);
});

test('initial preenche campos de nome e pontos', () => {
    const renderer = render({ initial: { id: 't1', name: 'Lavar louça', points: '15' } });
    expect(findNameInput(renderer).props.value).toBe('Lavar louça');
    expect(findPointsInput(renderer).props.value).toBe('15');
});

test('botão desabilitado quando campos estão vazios', () => {
    const renderer = render();
    const btn = findConfirmBtn(renderer);
    expect(btn?.props.disabled).toBe(true);
});

test('submit sem nome exibe erro "Informe o nome da tarefa."', () => {
    const renderer = render();
    // Nome com só espaços (trim() = '') + pontos preenchido
    // canSubmit verifica trim(), então '   ' torna disabled=true,
    // mas podemos chamar onPress diretamente para testar handleConfirm
    act(() => {
        findNameInput(renderer).props.onChangeText('   ');
        findPointsInput(renderer).props.onChangeText('10');
    });
    // Invoca onPress diretamente — bypassa disabled no JS
    act(() => { findConfirmBtn(renderer)?.props.onPress(); });
    expect(hasText(renderer.toJSON(), 'Informe o nome da tarefa.')).toBe(true);
});

test('submit com pontuação 0 exibe erro "Pontuação mínima: 1."', () => {
    const renderer = render();
    act(() => {
        findNameInput(renderer).props.onChangeText('Lavar');
        findPointsInput(renderer).props.onChangeText('0');
    });
    act(() => { findConfirmBtn(renderer)?.props.onPress(); });
    expect(hasText(renderer.toJSON(), 'Pontuação mínima: 1.')).toBe(true);
});

test('submit com pontuação > 1000 exibe erro "Pontuação máxima: 1000."', () => {
    const renderer = render();
    act(() => {
        findNameInput(renderer).props.onChangeText('Lavar');
        findPointsInput(renderer).props.onChangeText('1001');
    });
    act(() => { findConfirmBtn(renderer)?.props.onPress(); });
    expect(hasText(renderer.toJSON(), 'Pontuação máxima: 1000.')).toBe(true);
});

test('submit válido chama onConfirm com nome trimado e pontos numéricos', () => {
    const renderer = render();
    act(() => {
        findNameInput(renderer).props.onChangeText('  Varrer  ');
        findPointsInput(renderer).props.onChangeText('20');
    });
    act(() => { findConfirmBtn(renderer)?.props.onPress(); });
    expect(mockConfirm).toHaveBeenCalledWith('Varrer', 20);
});

test('cancelar chama onCancel', () => {
    const renderer = render();
    act(() => { findCancelBtn(renderer).props.onPress(); });
    expect(mockCancel).toHaveBeenCalledTimes(1);
});

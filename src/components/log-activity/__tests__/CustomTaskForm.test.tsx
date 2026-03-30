/**
 * CustomTaskForm — validação e submit
 */

import React from 'react';
import { create, act, ReactTestRenderer } from 'react-test-renderer';
import { CustomTaskForm } from '../CustomTaskForm';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function allText(node: any): string[] {
    if (!node) return [];
    if (typeof node === 'string') return [node];
    if (typeof node === 'number') return [String(node)];
    if (Array.isArray(node)) return node.flatMap(allText);
    if (node.children) return allText(node.children);
    return [];
}

function findPressableAncestor(node: any): any {
    let current = node?.parent;
    while (current) {
        if (typeof current.props?.onPress === 'function') return current;
        current = current.parent;
    }
    return null;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

const mockSubmit = jest.fn();
const mockCancel = jest.fn();

beforeEach(() => { jest.clearAllMocks(); });

function render(props: Partial<React.ComponentProps<typeof CustomTaskForm>> = {}): ReactTestRenderer {
    let renderer!: ReactTestRenderer;
    act(() => {
        renderer = create(
            React.createElement(CustomTaskForm, {
                loading: false,
                onSubmit: mockSubmit,
                onCancel: mockCancel,
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
        (n) => n.type === 'TextInput' && n.props.placeholder === 'Pontos',
    );
}

function findSubmitBtn(renderer: ReactTestRenderer) {
    const text = renderer.root.find(
        (n) => n.type === 'Text' && n.props.children === 'Registrar',
    );
    return findPressableAncestor(text);
}

function findCancelBtn(renderer: ReactTestRenderer) {
    const text = renderer.root.find(
        (n) => n.type === 'Text' && n.props.children === 'Cancelar',
    );
    return findPressableAncestor(text);
}

// ─── Testes ──────────────────────────────────────────────────────────────────

test('renderiza campos de nome e pontos', () => {
    const renderer = render();
    expect(findNameInput(renderer)).toBeTruthy();
    expect(findPointsInput(renderer)).toBeTruthy();
});

test('botão "Registrar" desabilitado com campos vazios', () => {
    expect(findSubmitBtn(render())?.props.disabled).toBe(true);
});

test('botão "Registrar" habilitado quando nome e pontos preenchidos', () => {
    const renderer = render();
    act(() => {
        findNameInput(renderer).props.onChangeText('Passar pano');
        findPointsInput(renderer).props.onChangeText('5');
    });
    expect(findSubmitBtn(renderer)?.props.disabled).toBe(false);
});

test('submit chama onSubmit com nome trimado e pontos numéricos', () => {
    const renderer = render();
    act(() => {
        findNameInput(renderer).props.onChangeText('  Varrer  ');
        findPointsInput(renderer).props.onChangeText('12');
    });
    act(() => { findSubmitBtn(renderer)?.props.onPress(); });
    expect(mockSubmit).toHaveBeenCalledWith('Varrer', 12);
});

test('cancelar chama onCancel', () => {
    const renderer = render();
    act(() => { findCancelBtn(renderer)?.props.onPress(); });
    expect(mockCancel).toHaveBeenCalledTimes(1);
});

test('loading=true desabilita campos e mostra ActivityIndicator', () => {
    const renderer = render({ loading: true });
    expect(findNameInput(renderer).props.editable).toBe(false);
    expect(findPointsInput(renderer).props.editable).toBe(false);
    expect(renderer.root.findAll((n) => n.type === 'ActivityIndicator').length).toBeGreaterThan(0);
});

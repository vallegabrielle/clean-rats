/**
 * AnimatedButton — label, loading, disabled, onPress
 */

import React from 'react';
import { create, act, ReactTestRenderer } from 'react-test-renderer';
import { AnimatedButton } from '../AnimatedButton';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function allText(node: any): string[] {
    if (!node) return [];
    if (typeof node === 'string') return [node];
    if (typeof node === 'number') return [String(node)];
    if (Array.isArray(node)) return node.flatMap(allText);
    if (node.children) return allText(node.children);
    return [];
}

/** Nó raiz do componente que tem onPress (TouchableWithoutFeedback). */
function findTouchable(renderer: ReactTestRenderer) {
    return renderer.root.find((n) => typeof n.props.onPress === 'function');
}

// ─── Setup ───────────────────────────────────────────────────────────────────

const mockPress = jest.fn();

beforeEach(() => { jest.clearAllMocks(); });

function render(props: Partial<React.ComponentProps<typeof AnimatedButton>> = {}): ReactTestRenderer {
    let renderer!: ReactTestRenderer;
    act(() => {
        renderer = create(
            React.createElement(AnimatedButton, {
                label: 'Confirmar',
                onPress: mockPress,
                ...props,
            }),
        );
    });
    return renderer;
}

// ─── Testes ──────────────────────────────────────────────────────────────────

test('renderiza o label passado via prop', () => {
    const tree = render({ label: 'Entrar' }).toJSON();
    expect(allText(tree)).toContain('Entrar');
});

test('mostra ActivityIndicator e oculta label quando loading=true', () => {
    const renderer = render({ loading: true });
    // ActivityIndicator presente
    expect(renderer.root.findAll((n) => n.type === 'ActivityIndicator').length).toBeGreaterThan(0);
    // Label não renderizado
    expect(allText(renderer.toJSON())).not.toContain('Confirmar');
});

test('disabled=true desabilita o TouchableWithoutFeedback', () => {
    const btn = findTouchable(render({ disabled: true }));
    expect(btn.props.disabled).toBe(true);
});

test('loading=true também desabilita o botão', () => {
    const renderer = render({ loading: true });
    // disabled={disabled || loading} = undefined || true = true
    // Verifica que algum nó na árvore tem disabled=true
    const disabledNodes = renderer.root.findAll((n) => n.props.disabled === true);
    expect(disabledNodes.length).toBeGreaterThan(0);
});

test('onPress chamado ao pressionar quando habilitado', () => {
    const btn = findTouchable(render());
    act(() => { btn.props.onPress(); });
    expect(mockPress).toHaveBeenCalledTimes(1);
});

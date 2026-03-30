/**
 * MembersSection — expand/collapse, listagem de membros, approve/reject
 */

import React from 'react';
import { create, act, ReactTestRenderer } from 'react-test-renderer';
import { MembersSection } from '../MembersSection';
import { JoinRequest } from '../../../types';

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

const members = [
    { id: 'u1', name: 'Alice' },
    { id: 'u2', name: 'Bob' },
];

const pending: JoinRequest[] = [
    { userId: 'u3', name: 'Carol', requestedAt: new Date().toISOString() },
];

// ─── Setup ───────────────────────────────────────────────────────────────────

const mockApprove = jest.fn(() => Promise.resolve());
const mockReject = jest.fn(() => Promise.resolve());

beforeEach(() => { jest.clearAllMocks(); });

function render(props: Partial<React.ComponentProps<typeof MembersSection>> = {}): ReactTestRenderer {
    let renderer!: ReactTestRenderer;
    act(() => {
        renderer = create(
            React.createElement(MembersSection, {
                members,
                pendingRequests: [],
                defaultExpanded: false,
                onApprove: mockApprove,
                onReject: mockReject,
                ...props,
            }),
        );
    });
    return renderer;
}

/** Pressiona o botão "Ver membros" (toggle). */
function pressToggle(renderer: ReactTestRenderer) {
    const toggleText = renderer.root.find((n) => n.type === 'Text' && n.props.children === 'Ver membros');
    let btn = toggleText?.parent;
    while (btn && typeof btn.props?.onPress !== 'function') btn = btn.parent;
    act(() => { btn!.props.onPress(); });
}

// ─── Testes ──────────────────────────────────────────────────────────────────

test('recolhido por padrão (defaultExpanded=false) — membros não visíveis', () => {
    const tree = render().toJSON();
    expect(hasText(tree, 'Alice')).toBe(false);
    expect(hasText(tree, 'Ver membros')).toBe(true);
});

test('expandido por padrão (defaultExpanded=true) — membros visíveis', () => {
    const tree = render({ defaultExpanded: true }).toJSON();
    expect(hasText(tree, 'Alice')).toBe(true);
    expect(hasText(tree, 'Bob')).toBe(true);
});

test('clicar em "Ver membros" expande e mostra lista', () => {
    const renderer = render();
    expect(hasText(renderer.toJSON(), 'Alice')).toBe(false);

    pressToggle(renderer);

    expect(hasText(renderer.toJSON(), 'Alice')).toBe(true);
    expect(hasText(renderer.toJSON(), 'Bob')).toBe(true);
});

test('clicar duas vezes em "Ver membros" recolhe novamente', () => {
    const renderer = render();
    pressToggle(renderer); // abre
    pressToggle(renderer); // fecha
    expect(hasText(renderer.toJSON(), 'Alice')).toBe(false);
});

test('badge com count aparece quando há solicitações pendentes', () => {
    const tree = render({ pendingRequests: pending }).toJSON();
    // Badge mostra o número de pendentes
    expect(allText(tree)).toContain('1');
});

test('"Aguardando aprovação" e nome do pendente aparecem quando expandido', () => {
    const renderer = render({ pendingRequests: pending, defaultExpanded: true });
    const tree = renderer.toJSON();
    expect(hasText(tree, 'Aguardando aprovação')).toBe(true);
    expect(hasText(tree, 'Carol')).toBe(true);
});

test('pressionar ✓ chama onApprove com userId correto', async () => {
    const renderer = render({ pendingRequests: pending, defaultExpanded: true });

    const approveText = renderer.root.find((n) => n.type === 'Text' && n.props.children === '✓');
    let btn = approveText?.parent;
    while (btn && typeof btn.props?.onPress !== 'function') btn = btn.parent;

    await act(async () => { btn!.props.onPress(); });

    expect(mockApprove).toHaveBeenCalledWith('u3');
});

test('pressionar ✕ chama onReject com userId correto', async () => {
    const renderer = render({ pendingRequests: pending, defaultExpanded: true });

    const rejectText = renderer.root.find((n) => n.type === 'Text' && n.props.children === '✕');
    let btn = rejectText?.parent;
    while (btn && typeof btn.props?.onPress !== 'function') btn = btn.parent;

    await act(async () => { btn!.props.onPress(); });

    expect(mockReject).toHaveBeenCalledWith('u3');
});

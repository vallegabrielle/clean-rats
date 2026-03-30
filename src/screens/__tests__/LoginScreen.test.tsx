/**
 * LoginScreen — testes 141–146
 */

import React from 'react';
import { create, act, ReactTestRenderer } from 'react-test-renderer';
import LoginScreen from '../LoginScreen';
import { useAuth } from '../../contexts/AuthContext';
import * as Google from 'expo-auth-session/providers/google';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('expo-web-browser', () => ({
    maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-auth-session/providers/google', () => ({
    useAuthRequest: jest.fn(),
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('@expo/vector-icons', () => ({
    AntDesign: () => null,
}));

jest.mock('../../contexts/AuthContext', () => ({
    useAuth: jest.fn(),
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

// ─── Setup ───────────────────────────────────────────────────────────────────

const mockPromptAsync = jest.fn();
const mockLoginWithGoogle = jest.fn(() => Promise.resolve());

beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAuth).mockReturnValue({ loginWithGoogle: mockLoginWithGoogle } as any);
    // Default: request disponível, sem resposta ainda
    jest.mocked(Google.useAuthRequest).mockReturnValue([
        {} as any,   // request
        null,        // response
        mockPromptAsync,
    ]);
});

function render(): ReactTestRenderer {
    let renderer!: ReactTestRenderer;
    act(() => {
        renderer = create(React.createElement(LoginScreen));
    });
    return renderer;
}

// ─── Testes ──────────────────────────────────────────────────────────────────

// 141
test('renderiza título "Clean Rats" e botão "Entrar com Google"', () => {
    const tree = render().toJSON();
    expect(hasText(tree, 'Clean Rats')).toBe(true);
    expect(hasText(tree, 'Entrar com Google')).toBe(true);
});

/** Sobe a árvore a partir de um nó até encontrar um ancestral com onPress. */
function findPressableAncestor(node: any): any {
    let current = node?.parent;
    while (current) {
        if (typeof current.props?.onPress === 'function') return current;
        current = current.parent;
    }
    return null;
}

// 142
test('botão desabilitado quando request é null (Google auth não carregado)', () => {
    jest.mocked(Google.useAuthRequest).mockReturnValue([null, null, mockPromptAsync]);
    const renderer = render();
    const labelNode = renderer.root.find(
        (n) => n.type === 'Text' && n.props.children === 'Entrar com Google',
    );
    const btn = findPressableAncestor(labelNode);
    expect(btn).toBeTruthy();
    expect(btn.props.disabled).toBe(true);
});

// 143
test('pressionar botão chama promptAsync', () => {
    const renderer = render();
    const labelNode = renderer.root.find(
        (n) => n.type === 'Text' && n.props.children === 'Entrar com Google',
    );
    const btn = findPressableAncestor(labelNode);
    expect(btn.props.disabled).toBeFalsy();
    act(() => { btn.props.onPress(); });
    expect(mockPromptAsync).toHaveBeenCalledTimes(1);
});

// 144
test('response.type="error" exibe mensagem de erro', () => {
    jest.mocked(Google.useAuthRequest).mockReturnValue([
        {} as any,
        { type: 'error' } as any,
        mockPromptAsync,
    ]);
    const tree = render().toJSON();
    expect(hasText(tree, 'Erro ao entrar com Google')).toBe(true);
});

// 145
test('response.type="success" sem id_token exibe erro de token', () => {
    jest.mocked(Google.useAuthRequest).mockReturnValue([
        {} as any,
        { type: 'success', params: {} } as any,
        mockPromptAsync,
    ]);
    const tree = render().toJSON();
    expect(hasText(tree, 'Não foi possível obter o token do Google')).toBe(true);
});

// 146
test('response.type="success" com id_token chama loginWithGoogle', async () => {
    jest.mocked(Google.useAuthRequest).mockReturnValue([
        {} as any,
        { type: 'success', params: { id_token: 'tok-abc' } } as any,
        mockPromptAsync,
    ]);
    await act(async () => {
        create(React.createElement(LoginScreen));
    });
    expect(mockLoginWithGoogle).toHaveBeenCalledWith('tok-abc');
});

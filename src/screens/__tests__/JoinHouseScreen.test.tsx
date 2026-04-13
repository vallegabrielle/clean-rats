/**
 * JoinHouseScreen — testes 122–126
 */

import React from 'react';
import { create, act, ReactTestRenderer } from 'react-test-renderer';
import JoinHouseScreen from '../JoinHouseScreen';
import { useHouseStore } from '../../contexts/HouseContext';
import { useNavigation } from '@react-navigation/native';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../../../App', () => ({}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('@react-navigation/native', () => ({
    useNavigation: jest.fn(() => ({ navigate: jest.fn(), goBack: jest.fn() })),
    useRoute: jest.fn(() => ({ params: {} })),
}));

jest.mock('../../contexts/HouseContext', () => ({
    useHouseStore: jest.fn(),
    selectActiveHouse: (s: any) =>
        s?.houses?.find((h: any) => h.id === s.activeHouseId) ?? null,
}));

// AnimatedButton simplificado: expõe label e disabled como props testáveis
jest.mock('../../components/AnimatedButton', () => ({
    AnimatedButton: ({ label, onPress, disabled, loading }: any) => {
        const React = require('react');
        const { TouchableOpacity, Text, ActivityIndicator } = require('react-native');
        return React.createElement(
            TouchableOpacity,
            { onPress, disabled: disabled || loading, testID: 'animated-btn' },
            loading
                ? React.createElement(ActivityIndicator, null)
                : React.createElement(Text, null, label),
        );
    },
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

const mockNavigate = jest.fn();
const mockJoinByCode = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useNavigation).mockReturnValue({
        navigate: mockNavigate,
        goBack: jest.fn(),
    } as any);
    jest.mocked(useHouseStore).mockImplementation((selector: any) => {
        const state = { joinHouseByCode: mockJoinByCode };
        return selector ? selector(state) : state;
    });
});

function render(): ReactTestRenderer {
    let renderer!: ReactTestRenderer;
    act(() => {
        renderer = create(React.createElement(JoinHouseScreen));
    });
    return renderer;
}

// ─── Testes ──────────────────────────────────────────────────────────────────

// 122
test('botão "Entrar" desabilitado quando código está vazio', () => {
    const renderer = render();
    // O AnimatedButton recebe disabled={!code.trim()} — com code='', fica disabled
    const btn = renderer.root.find(
        (node) => node.props.testID === 'animated-btn',
    );
    expect(btn.props.disabled).toBe(true);
});

// 123
test('após join com pending, mostra tela "Solicitação enviada!"', async () => {
    mockJoinByCode.mockResolvedValue({ success: true, pending: true });
    const renderer = render();

    // Digita um código no input
    const input = renderer.root.find((node) => node.props.maxLength === 8);
    act(() => {
        input.props.onChangeText('ABC12345');
    });

    // Pressiona o botão de join
    const btn = renderer.root.find((node) => node.props.testID === 'animated-btn');
    await act(async () => {
        btn.props.onPress();
    });

    expect(hasText(renderer.toJSON(), 'Solicitação enviada!')).toBe(true);
});

// 124
test('tela de pending não navega para Home automaticamente', async () => {
    mockJoinByCode.mockResolvedValue({ success: true, pending: true });
    const renderer = render();

    const input = renderer.root.find((node) => node.props.maxLength === 8);
    act(() => { input.props.onChangeText('XYZ999'); });

    const btn = renderer.root.find((node) => node.props.testID === 'animated-btn');
    await act(async () => { btn.props.onPress(); });

    expect(mockNavigate).not.toHaveBeenCalled();
});

// 125
test('"Voltar ao início" na tela de pending navega para Home', async () => {
    mockJoinByCode.mockResolvedValue({ success: true, pending: true });
    const renderer = render();

    const input = renderer.root.find((node) => node.props.maxLength === 8);
    act(() => { input.props.onChangeText('ABC123'); });

    const joinBtn = renderer.root.find((node) => node.props.testID === 'animated-btn');
    await act(async () => { joinBtn.props.onPress(); });

    // Agora está na tela de pending — encontra o botão "Voltar ao início"
    const backBtn = renderer.root.find((node) => node.props.testID === 'animated-btn');
    act(() => { backBtn.props.onPress(); });

    expect(mockNavigate).toHaveBeenCalledWith('Home');
});

// 126
test('código inválido exibe mensagem de erro', async () => {
    mockJoinByCode.mockResolvedValue({
        success: false,
        error: 'Código não encontrado.',
    });
    const renderer = render();

    const input = renderer.root.find((node) => node.props.maxLength === 8);
    act(() => { input.props.onChangeText('NOPE00'); });

    const btn = renderer.root.find((node) => node.props.testID === 'animated-btn');
    await act(async () => { btn.props.onPress(); });

    expect(hasText(renderer.toJSON(), 'Código não encontrado.')).toBe(true);
});

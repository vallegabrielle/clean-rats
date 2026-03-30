/**
 * MembersScreen — testes 127–131
 * Estratégia: mock de store + computeScores; react-test-renderer para render.
 */

import React from 'react';
import { create, act } from 'react-test-renderer';
import MembersScreen from '../MembersScreen';
import { useHouseStore } from '../../contexts/HouseContext';
import { useAuth } from '../../contexts/AuthContext';
import { computeScores } from '../../services/period';
import { MemberScore } from '../../types';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({ children }: any) =>
        require('react').createElement(require('react-native').View, null, children),
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('../../contexts/HouseContext', () => ({
    useHouseStore: jest.fn(),
    selectActiveHouse: (state: any) =>
        state?.houses?.find((h: any) => h.id === state.activeHouseId) ?? null,
}));

jest.mock('../../contexts/AuthContext', () => ({
    useAuth: jest.fn(() => ({ user: { uid: 'user-1' } })),
}));

jest.mock('../../services/period', () => ({ computeScores: jest.fn() }));

jest.mock('../../components/ScreenHeader', () => ({
    ScreenHeader: () => null,
}));

jest.mock('../../components/EmptyState', () => ({
    EmptyState: ({ text }: any) =>
        require('react').createElement(require('react-native').Text, null, text),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Coleta todos os textos (strings e números) de uma árvore toJSON(). */
function allText(node: any): string[] {
    if (!node) return [];
    if (typeof node === 'string') return [node];
    if (typeof node === 'number') return [String(node)];
    if (Array.isArray(node)) return node.flatMap(allText);
    if (node.children) return allText(node.children);
    return [];
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockScores: MemberScore[] = [
    { member: { id: 'u1', name: 'Alice' }, points: 30, completedTasks: 3 },
    { member: { id: 'u2', name: 'Bob' }, points: 20, completedTasks: 2 },
    { member: { id: 'u3', name: 'Carol' }, points: 10, completedTasks: 1 },
    { member: { id: 'u4', name: 'Dave' }, points: 0, completedTasks: 0 },
];

const mockState = {
    houses: [
        {
            id: 'house-1',
            name: 'Test House',
            code: 'ABC123',
            period: 'weekly' as const,
            memberIds: mockScores.map((s) => s.member.id),
            members: mockScores.map((s) => s.member),
            tasks: [{ id: 'task-1', name: 'Lavar', points: 10, isDefault: true }],
            logs: [],
            createdAt: '2024-01-01T00:00:00.000Z',
            periodStart: new Date().toISOString(),
            history: [],
        },
    ],
    activeHouseId: 'house-1',
    loadingHouses: false,
};

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.mocked(computeScores).mockReturnValue(mockScores);
    jest.mocked(useHouseStore).mockImplementation((selector: any) =>
        selector ? selector(mockState) : mockState,
    );
    jest.mocked(useAuth).mockReturnValue({ user: { uid: 'user-1' } } as any);
});

// ─── Testes ──────────────────────────────────────────────────────────────────

function render() {
    let renderer: any;
    act(() => {
        renderer = create(React.createElement(MembersScreen));
    });
    return renderer;
}

// 127
test('1º lugar tem 🥇', () => {
    const texts = allText(render().toJSON());
    expect(texts).toContain('🥇');
});

// 128
test('2º lugar tem 🥈', () => {
    const texts = allText(render().toJSON());
    expect(texts).toContain('🥈');
});

// 129
test('3º lugar tem 🥉', () => {
    const texts = allText(render().toJSON());
    expect(texts).toContain('🥉');
});

// 130
test('membros ordenados por pontos decrescente (Alice > Bob > Carol)', () => {
    const texts = allText(render().toJSON());
    const ai = texts.indexOf('Alice');
    const bi = texts.indexOf('Bob');
    const ci = texts.indexOf('Carol');
    expect(ai).toBeLessThan(bi);
    expect(bi).toBeLessThan(ci);
});

// 131
test('membro sem pontos aparece com 0', () => {
    jest.mocked(computeScores).mockReturnValue([
        { member: { id: 'u1', name: 'Dave' }, points: 0, completedTasks: 0 },
    ]);
    const texts = allText(render().toJSON());
    // "0" aparece como pontuação do Dave
    expect(texts.filter((t) => t === '0').length).toBeGreaterThanOrEqual(1);
});

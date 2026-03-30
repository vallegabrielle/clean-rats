/**
 * HistoryScreen — testes 155–159
 */

import React from 'react';
import { create, act, ReactTestRenderer } from 'react-test-renderer';
import HistoryScreen from '../HistoryScreen';
import { useHouseStore } from '../../contexts/HouseContext';
import { PeriodRecord } from '../../types';

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

jest.mock('../../components/ScreenHeader', () => ({
    ScreenHeader: () => null,
}));

jest.mock('../../components/EmptyState', () => ({
    EmptyState: ({ icon, title, text }: any) => {
        const React = require('react');
        const { View, Text } = require('react-native');
        return React.createElement(View, null,
            icon && React.createElement(Text, null, icon),
            title && React.createElement(Text, null, title),
            text && React.createElement(Text, null, text),
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

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeRecord(overrides: Partial<PeriodRecord> = {}): PeriodRecord {
    return {
        periodStart: '2024-01-01T00:00:00.000Z',
        periodEnd: '2024-01-31T00:00:00.000Z',
        scores: [
            { memberId: 'u1', memberName: 'Alice', points: 30, completedTasks: 3 },
            { memberId: 'u2', memberName: 'Bob', points: 10, completedTasks: 1 },
        ],
        ...overrides,
    };
}

function makeHouse(history: PeriodRecord[]) {
    return {
        id: 'house-1',
        name: 'Test',
        code: 'ABC',
        period: 'weekly' as const,
        memberIds: [],
        members: [],
        tasks: [],
        logs: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        periodStart: new Date().toISOString(),
        history,
        pendingRequests: [],
        pendingMemberIds: [],
    };
}

function setupStore(history: PeriodRecord[]) {
    const house = makeHouse(history);
    const state = {
        houses: [house],
        activeHouseId: 'house-1',
    };
    jest.mocked(useHouseStore).mockImplementation((selector: any) =>
        selector ? selector(state) : state,
    );
}

function render(): ReactTestRenderer {
    let renderer!: ReactTestRenderer;
    act(() => {
        renderer = create(React.createElement(HistoryScreen));
    });
    return renderer;
}

// ─── Testes ──────────────────────────────────────────────────────────────────

// 155
test('empty state exibido quando histórico está vazio', () => {
    setupStore([]);
    const tree = render().toJSON();
    expect(hasText(tree, 'Nada por aqui ainda')).toBe(true);
});

// 156
test('cards de período aparecem quando há histórico', () => {
    setupStore([makeRecord()]);
    const tree = render().toJSON();
    expect(hasText(tree, 'Período')).toBe(true);
    expect(hasText(tree, 'Alice')).toBe(true);
    expect(hasText(tree, 'Bob')).toBe(true);
});

// 157
test('scores ordenados por pontos decrescente dentro do card (Alice > Bob)', () => {
    setupStore([makeRecord()]);
    const texts = allText(render().toJSON());
    const ai = texts.indexOf('Alice');
    const bi = texts.indexOf('Bob');
    // Alice tem 30 pts, Bob tem 10 — Alice aparece primeiro
    expect(ai).toBeLessThan(bi);
    expect(ai).toBeGreaterThan(-1);
});

// 158
test('número do período exibido corretamente (Período 1 para 1 registro)', () => {
    setupStore([makeRecord()]);
    // "Período {index}" renderiza como ['Período ', 1] — usar join
    const texts = allText(render().toJSON()).join('');
    expect(texts).toContain('Período 1');
});

// 159
test('"Nenhum registro" quando scores de um período está vazio', () => {
    setupStore([makeRecord({ scores: [] })]);
    const tree = render().toJSON();
    expect(hasText(tree, 'Nenhum registro')).toBe(true);
});

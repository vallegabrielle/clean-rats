/**
 * HouseSettingsModal — share, leave, openToRequests
 */

import React from 'react';
import { create, act, ReactTestRenderer } from 'react-test-renderer';
import { Share, Alert } from 'react-native';
import { HouseSettingsModal } from '../HouseSettingsModal';
import { useHouseStore } from '../../contexts/HouseContext';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: jest.fn(() => ({ bottom: 0, top: 0, left: 0, right: 0 })),
}));

jest.mock('../../hooks/useSheetDismiss', () => ({
    useSheetDismiss: jest.fn(() => ({ translateY: 0, panHandlers: {} })),
}));

jest.mock('../../contexts/HouseContext', () => ({
    useHouseStore: jest.fn(),
    selectActiveHouse: (s: any) =>
        s?.houses?.find((h: any) => h.id === s.activeHouseId) ?? null,
}));

jest.mock('../../contexts/AuthContext', () => ({
    useAuth: jest.fn(() => ({ user: { uid: 'user-1', displayName: 'Alice' } })),
}));

// Sub-componentes de settings — irrelevantes para estes testes
jest.mock('../house-settings/RenameOption', () => ({
    RenameOption: () => null,
}));
jest.mock('../house-settings/PrizeOption', () => ({
    PrizeOption: () => null,
}));
jest.mock('../house-settings/PeriodOption', () => ({
    PeriodOption: () => null,
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

const mockLeaveHouse = jest.fn(() => Promise.resolve());
const mockOnClose = jest.fn();

const house = {
    id: 'house-1',
    name: 'Toca das Ratas',
    code: 'RAT123',
    period: 'weekly' as const,
    memberIds: ['u1'],
    members: [{ id: 'u1', name: 'Alice' }],
    tasks: [],
    logs: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    periodStart: new Date().toISOString(),
    history: [],
    pendingRequests: [],
    pendingMemberIds: [],
};

function setupStore(h: typeof house | null = house) {
    const state = {
        houses: h ? [h] : [],
        activeHouseId: h ? h.id : null,
        logs: [],
        leaveHouse: mockLeaveHouse,
        renameHouse: jest.fn(),
        updateHousePrize: jest.fn(),
        updateHousePeriod: jest.fn(),
        removeMemberFromHouse: jest.fn(),
        seedMockData: jest.fn(),
        approveJoinRequest: jest.fn(),
        rejectJoinRequest: jest.fn(),
    };
    jest.mocked(useHouseStore).mockImplementation((selector: any) =>
        selector ? selector(state) : state,
    );
}

beforeEach(() => {
    jest.clearAllMocks();
    setupStore();
});

function render(props: Partial<React.ComponentProps<typeof HouseSettingsModal>> = {}): ReactTestRenderer {
    let renderer!: ReactTestRenderer;
    act(() => {
        renderer = create(
            React.createElement(HouseSettingsModal, {
                visible: true,
                onClose: mockOnClose,
                ...props,
            }),
        );
    });
    return renderer;
}

// ─── Testes ──────────────────────────────────────────────────────────────────

test('retorna null quando não há house ativa', () => {
    setupStore(null);
    const renderer = render();
    // O Modal renderiza null internamente
    expect(renderer.toJSON()).toBeNull();
});

test('exibe nome e código da toca', () => {
    const tree = render().toJSON();
    expect(hasText(tree, 'Toca das Ratas')).toBe(true);
    expect(hasText(tree, 'RAT123')).toBe(true);
});

test('openToRequests=true expande a seção de membros (pendentes visíveis)', () => {
    const houseWithPending = {
        ...house,
        pendingRequests: [{ userId: 'u2', name: 'Bob', requestedAt: new Date().toISOString() }],
    };
    setupStore(houseWithPending);
    const tree = render({ openToRequests: true }).toJSON();
    // Com defaultExpanded=true, MembersSection mostra "Aguardando aprovação"
    expect(hasText(tree, 'Aguardando aprovação')).toBe(true);
});

test('"Compartilhar código" chama Share.share com o código da toca', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);
    const renderer = render();

    const shareText = renderer.root.find(
        (n) => n.type === 'Text' && n.props.children === 'Compartilhar código',
    );
    let shareBtn = shareText?.parent;
    while (shareBtn && typeof shareBtn.props?.onPress !== 'function') shareBtn = shareBtn.parent;

    await act(async () => { shareBtn!.props.onPress(); });

    expect(shareSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('RAT123') }),
    );
});

test('"Sair da toca" → Alert → confirmar → chama leaveHouse e onClose', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const renderer = render();

    const leaveText = renderer.root.find(
        (n) => n.type === 'Text' && n.props.children === 'Sair da toca',
    );
    let leaveBtn = leaveText?.parent;
    while (leaveBtn && typeof leaveBtn.props?.onPress !== 'function') leaveBtn = leaveBtn.parent;

    act(() => { leaveBtn!.props.onPress(); });

    expect(alertSpy).toHaveBeenCalled();

    const buttons: any[] = alertSpy.mock.calls[0][2] as any[];
    const confirmBtn = buttons.find((b: any) => b.style === 'destructive');

    await act(async () => { await confirmBtn.onPress(); });

    expect(mockLeaveHouse).toHaveBeenCalledWith('house-1');
    expect(mockOnClose).toHaveBeenCalled();
});

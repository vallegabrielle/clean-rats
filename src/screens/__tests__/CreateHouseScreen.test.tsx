/**
 * CreateHouseScreen — testes 147–154
 */

import React from 'react';
import { create, act, ReactTestRenderer } from 'react-test-renderer';
import CreateHouseScreen from '../CreateHouseScreen';
import { useHouseStore } from '../../contexts/HouseContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../../../App', () => ({}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('@react-navigation/native', () => ({
    useNavigation: jest.fn(),
}));

jest.mock('../../services/house', () => ({
    createHouse: jest.fn((_name: string, period: string, uid: string, displayName: string) => ({
        id: 'new-house',
        name: _name,
        period,
        code: 'NEWCOD',
        memberIds: [uid],
        members: [{ id: uid, name: displayName }],
        tasks: [],
        logs: [],
        createdAt: new Date().toISOString(),
        periodStart: new Date().toISOString(),
        history: [],
        pendingRequests: [],
        pendingMemberIds: [],
    })),
}));

jest.mock('../../contexts/HouseContext', () => ({
    useHouseStore: jest.fn(),
    MAX_HOUSES: 5,
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

const mockNavigate = jest.fn();
const mockAddHouseToList = jest.fn(() => Promise.resolve());

beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useNavigation).mockReturnValue({ navigate: mockNavigate } as any);
    jest.mocked(useAuth).mockReturnValue({
        user: { uid: 'user-1', displayName: 'Alice' },
    } as any);
    const state = { houses: [], addHouseToList: mockAddHouseToList };
    jest.mocked(useHouseStore).mockImplementation((selector: any) =>
        selector ? selector(state) : state,
    );
});

function render(): ReactTestRenderer {
    let renderer!: ReactTestRenderer;
    act(() => {
        renderer = create(React.createElement(CreateHouseScreen));
    });
    return renderer;
}

/** Encontra o TextInput do nome da toca (placeholder "Ex: República das Ratas"). */
function findNameInput(renderer: ReactTestRenderer) {
    return renderer.root.find(
        (n) => n.type === 'TextInput' && n.props.placeholder?.includes('República'),
    );
}

/** Encontra o botão "Criar Toca" — o título também usa esse texto, então pega o último. */
function findCreateBtn(renderer: ReactTestRenderer) {
    const textNodes = renderer.root.findAll(
        (n) => n.type === 'Text' && n.props.children === 'Criar Toca',
    );
    // O último é o botão (o primeiro é o título)
    const textNode = textNodes[textNodes.length - 1];
    let current = textNode?.parent;
    while (current) {
        if (typeof current.props?.onPress === 'function') return current;
        current = current.parent;
    }
    return null;
}

// ─── Testes ──────────────────────────────────────────────────────────────────

// 147
test('renderiza título "Criar Toca"', () => {
    const tree = render().toJSON();
    expect(hasText(tree, 'Criar Toca')).toBe(true);
});

// 148
test('todos os chips de tarefas padrão são exibidos e contagem inicial está correta', () => {
    // DEFAULT_TASKS tem 8 itens → contador renderiza como [8, ' selecionada', 's']
    const renderer = render();
    const tree = renderer.toJSON();
    expect(hasText(tree, 'Lavar louça')).toBe(true);
    expect(hasText(tree, 'Limpar banheiro')).toBe(true);
    // Usa join para checar string composta
    expect(allText(tree).join('')).toContain('8 selecionadas');
});

// 149
test('desmarcar um chip reduz a contagem de selecionadas', () => {
    const renderer = render();

    // Encontra o chip "Lavar louça" e pressiona
    const chipText = renderer.root.find(
        (n) => n.type === 'Text' && n.props.children === 'Lavar louça',
    );
    let chip = chipText?.parent;
    while (chip && typeof chip.props?.onPress !== 'function') chip = chip.parent;

    act(() => { chip!.props.onPress(); });

    expect(allText(renderer.toJSON()).join('')).toContain('7 selecionadas');
});

// 150
test('criar sem nome exibe erro "Dê um nome para a toca"', () => {
    const renderer = render();
    const btn = findCreateBtn(renderer);
    expect(btn).toBeTruthy();

    act(() => { btn!.props.onPress(); });

    expect(hasText(renderer.toJSON(), 'Dê um nome para a toca')).toBe(true);
});

// 151
test('criar sem tarefas exibe erro "Adicione pelo menos uma tarefa"', () => {
    const renderer = render();

    // Preenche o nome
    const nameInput = findNameInput(renderer);
    act(() => { nameInput.props.onChangeText('Minha Toca'); });

    // Desmarca todos os 8 chips
    const chipNames = [
        'Lavar louça', 'Varrer / Aspirar', 'Limpar banheiro', 'Tirar lixo',
        'Limpar cozinha', 'Lavar roupa', 'Passar roupa', 'Fazer compras',
    ];
    for (const chipName of chipNames) {
        const chipText = renderer.root.findAll(
            (n) => n.type === 'Text' && n.props.children === chipName,
        )[0];
        let chip = chipText?.parent;
        while (chip && typeof chip.props?.onPress !== 'function') chip = chip.parent;
        act(() => { chip!.props.onPress(); });
    }

    const btn = findCreateBtn(renderer);
    act(() => { btn!.props.onPress(); });

    expect(hasText(renderer.toJSON(), 'Adicione pelo menos uma tarefa')).toBe(true);
});

// 152
test('selecionar período "Semanal" exibe hint "Reinicia todo domingo"', () => {
    const renderer = render();

    const weeklyText = renderer.root.find(
        (n) => n.type === 'Text' && n.props.children === 'Semanal',
    );
    let weeklyBtn = weeklyText?.parent;
    while (weeklyBtn && typeof weeklyBtn.props?.onPress !== 'function') weeklyBtn = weeklyBtn.parent;

    act(() => { weeklyBtn!.props.onPress(); });

    expect(hasText(renderer.toJSON(), 'Reinicia todo domingo')).toBe(true);
});

// 153
test('"+ Criar tarefa personalizada" abre o formulário de tarefa custom', () => {
    const renderer = render();

    const addCustomText = renderer.root.find(
        (n) => n.type === 'Text' && String(n.props.children).includes('Criar tarefa personalizada'),
    );
    let addCustomBtn = addCustomText?.parent;
    while (addCustomBtn && typeof addCustomBtn.props?.onPress !== 'function')
        addCustomBtn = addCustomBtn.parent;

    act(() => { addCustomBtn!.props.onPress(); });

    // Formulário abre — verifica pelo TextInput com placeholder "Nome da tarefa"
    const input = renderer.root.find(
        (n) => n.type === 'TextInput' && n.props.placeholder === 'Nome da tarefa',
    );
    expect(input).toBeTruthy();
});

// 154
test('criar toca com sucesso chama addHouseToList e navega para Home', async () => {
    const renderer = render();

    const nameInput = findNameInput(renderer);
    act(() => { nameInput.props.onChangeText('República das Ratas'); });

    const btn = findCreateBtn(renderer);
    await act(async () => { btn!.props.onPress(); });

    expect(mockAddHouseToList).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('Home');
});

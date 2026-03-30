import React from 'react';
import { create, act } from 'react-test-renderer';
import { Animated, PanResponder } from 'react-native';
import { useDrawerAnimation } from '../useDrawerAnimation';

const MENU_WIDTH = 300;
jest.mock('../styles', () => ({ MENU_WIDTH: 300 }));

// ── helper mínimo de renderHook ───────────────────────────────────────────────

type HookResult<TProps, TResult> = {
    result: { current: TResult };
    rerender: (props: TProps) => void;
};

function renderHook<TProps extends object, TResult>(
    callback: (props: TProps) => TResult,
    options?: { initialProps?: TProps },
): HookResult<TProps, TResult> {
    const result = { current: {} as TResult };

    function TestHook({ hookProps }: { hookProps: TProps }) {
        result.current = callback(hookProps);
        return null;
    }

    const initialProps = (options?.initialProps ?? {}) as TProps;
    let instance: ReturnType<typeof create>;

    act(() => {
        instance = create(React.createElement(TestHook, { hookProps: initialProps }));
    });

    return {
        result,
        rerender: (newProps: TProps) => {
            act(() => {
                instance.update(React.createElement(TestHook, { hookProps: newProps }));
            });
        },
    };
}

// ── setup ─────────────────────────────────────────────────────────────────────

describe('useDrawerAnimation', () => {
    let springMock: jest.SpyInstance;
    // edgePan = panConfigs[0], drawerPan = panConfigs[1]
    let panConfigs: any[];

    beforeEach(() => {
        panConfigs = [];
        springMock = jest
            .spyOn(Animated, 'spring')
            .mockReturnValue({ start: jest.fn() } as any);
        jest.spyOn(PanResponder, 'create').mockImplementation((config) => {
            panConfigs.push(config);
            return { panHandlers: {} } as any;
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ── animação controlada por visible ───────────────────────────────────────

    test('visible=false na montagem não dispara spring (já está em -MENU_WIDTH)', () => {
        renderHook(({ visible }) => useDrawerAnimation(visible, jest.fn(), jest.fn()), {
            initialProps: { visible: false },
        });
        expect(springMock).not.toHaveBeenCalled();
    });

    test('visible=true na montagem → spring para toValue: 0 (abre)', () => {
        renderHook(({ visible }) => useDrawerAnimation(visible, jest.fn(), jest.fn()), {
            initialProps: { visible: true },
        });
        expect(springMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ toValue: 0 }),
        );
    });

    test('visible muda false → true → spring animado para 0', () => {
        const { rerender } = renderHook(
            ({ visible }) => useDrawerAnimation(visible, jest.fn(), jest.fn()),
            { initialProps: { visible: false } },
        );
        rerender({ visible: true });
        expect(springMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ toValue: 0 }),
        );
    });

    test('visible muda true → false → spring animado para -MENU_WIDTH (fecha)', () => {
        const { rerender } = renderHook(
            ({ visible }) => useDrawerAnimation(visible, jest.fn(), jest.fn()),
            { initialProps: { visible: true } },
        );
        rerender({ visible: false });
        const calls = springMock.mock.calls;
        expect(calls[calls.length - 1][1]).toMatchObject({ toValue: -MENU_WIDTH });
    });

    // ── snapToClose / snapToOpen ───────────────────────────────────────────────

    test('snapToClose chama onClose', () => {
        const onClose = jest.fn();
        const { result } = renderHook(
            ({ visible }) => useDrawerAnimation(visible, jest.fn(), onClose),
            { initialProps: { visible: false } },
        );
        act(() => { result.current.snapToClose(); });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    // ── Regressão: double-spring ───────────────────────────────────────────────

    test('[REGRESSÃO] snapToClose + visible=false → useEffect não dispara segundo spring', () => {
        const onClose = jest.fn();
        const { result, rerender } = renderHook(
            ({ visible }) => useDrawerAnimation(visible, jest.fn(), onClose),
            { initialProps: { visible: true } },
        );
        const springCountAfterOpen = springMock.mock.calls.length;

        act(() => { result.current.snapToClose(); });
        const springCountAfterGesture = springMock.mock.calls.length;
        expect(springCountAfterGesture).toBe(springCountAfterOpen + 1);

        // React atualiza visible=false em resposta ao onClose
        rerender({ visible: false });
        // useEffect NÃO deve disparar outro spring — basePosition já é -MENU_WIDTH
        expect(springMock.mock.calls.length).toBe(springCountAfterGesture);
    });

    test('[REGRESSÃO] menu abre na segunda vez após fechar via gesto', () => {
        const { result, rerender } = renderHook(
            ({ visible }) => useDrawerAnimation(visible, jest.fn(), jest.fn()),
            { initialProps: { visible: false } },
        );

        // Primeira abertura
        rerender({ visible: true });

        // Fecha via gesto + state update
        act(() => { result.current.snapToClose(); });
        rerender({ visible: false }); // não deve reanimar

        const countBefore = springMock.mock.calls.length;

        // Segunda abertura — deve animar normalmente
        rerender({ visible: true });
        expect(springMock.mock.calls.length).toBeGreaterThan(countBefore);
        const lastCall = springMock.mock.calls[springMock.mock.calls.length - 1];
        expect(lastCall[1]).toMatchObject({ toValue: 0 });
    });

    test('[REGRESSÃO] snapToClose chama onClose exatamente uma vez', () => {
        const onClose = jest.fn();
        const { result, rerender } = renderHook(
            ({ visible }) => useDrawerAnimation(visible, jest.fn(), onClose),
            { initialProps: { visible: true } },
        );

        act(() => { result.current.snapToClose(); });
        rerender({ visible: false }); // simula state update do onClose

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    // ── edgePan (borda → abre) ────────────────────────────────────────────────

    test('edgePan: velocidade alta para direita (vx > 0.3) → snapToOpen', () => {
        const onOpen = jest.fn();
        renderHook(({ visible }) => useDrawerAnimation(visible, onOpen, jest.fn()), {
            initialProps: { visible: false },
        });
        act(() => {
            panConfigs[0].onPanResponderRelease({}, { dx: 0, vx: 0.4 });
        });
        expect(onOpen).toHaveBeenCalled();
    });

    test('edgePan: drag além do meio → snapToOpen', () => {
        const onOpen = jest.fn();
        renderHook(({ visible }) => useDrawerAnimation(visible, onOpen, jest.fn()), {
            initialProps: { visible: false },
        });
        // basePosition=-300, dx=200 → -300+200=-100 > -150 (meio) → abre
        act(() => {
            panConfigs[0].onPanResponderRelease({}, { dx: 200, vx: 0 });
        });
        expect(onOpen).toHaveBeenCalled();
    });

    test('edgePan: drag curto + vx baixo → snapToClose', () => {
        const onOpen = jest.fn();
        const onClose = jest.fn();
        renderHook(({ visible }) => useDrawerAnimation(visible, onOpen, onClose), {
            initialProps: { visible: false },
        });
        // basePosition=-300, dx=50 → -300+50=-250 < -150 → fecha
        act(() => {
            panConfigs[0].onPanResponderRelease({}, { dx: 50, vx: 0 });
        });
        expect(onClose).toHaveBeenCalled();
        expect(onOpen).not.toHaveBeenCalled();
    });

    // ── drawerPan (dentro do drawer → fecha) ──────────────────────────────────

    test('drawerPan: velocidade alta negativa (vx < -0.3) → snapToClose', () => {
        const onOpen = jest.fn();
        const onClose = jest.fn();
        renderHook(({ visible }) => useDrawerAnimation(visible, onOpen, onClose), {
            initialProps: { visible: false },
        });
        // Abre primeiro via edgePan
        act(() => { panConfigs[0].onPanResponderRelease({}, { dx: 200, vx: 0 }); });
        onClose.mockClear();

        act(() => { panConfigs[1].onPanResponderRelease({}, { dx: 0, vx: -0.4 }); });
        expect(onClose).toHaveBeenCalled();
    });

    test('drawerPan: drag além do meio para esquerda → snapToClose', () => {
        const onClose = jest.fn();
        renderHook(({ visible }) => useDrawerAnimation(visible, jest.fn(), onClose), {
            initialProps: { visible: false },
        });
        // Abre via edgePan (basePosition = 0)
        act(() => { panConfigs[0].onPanResponderRelease({}, { dx: 200, vx: 0 }); });
        onClose.mockClear();

        // basePosition=0, dx=-200 → 0-200=-200 < -150 → fecha
        act(() => { panConfigs[1].onPanResponderRelease({}, { dx: -200, vx: 0 }); });
        expect(onClose).toHaveBeenCalled();
    });

    test('drawerPan: drag pequeno para esquerda → snap de volta (onOpen)', () => {
        const onOpen = jest.fn();
        const onClose = jest.fn();
        renderHook(({ visible }) => useDrawerAnimation(visible, onOpen, onClose), {
            initialProps: { visible: false },
        });
        // Abre via edgePan
        act(() => { panConfigs[0].onPanResponderRelease({}, { dx: 200, vx: 0 }); });
        onOpen.mockClear();
        onClose.mockClear();

        // basePosition=0, dx=-50 → 0-50=-50 > -150 → snap de volta (abre)
        act(() => { panConfigs[1].onPanResponderRelease({}, { dx: -50, vx: 0 }); });
        expect(onOpen).toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });
});

import React from 'react';
import { create, act } from 'react-test-renderer';
import { Animated, PanResponder } from 'react-native';
import { useSheetDismiss } from '../useSheetDismiss';

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

describe('useSheetDismiss', () => {
    let capturedConfig: any;
    let springMock: jest.SpyInstance;

    beforeEach(() => {
        springMock = jest
            .spyOn(Animated, 'spring')
            .mockReturnValue({ start: jest.fn() } as any);
        jest.spyOn(PanResponder, 'create').mockImplementation((config) => {
            capturedConfig = config;
            return { panHandlers: {} } as any;
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ── release: fecha ou faz snap de volta ───────────────────────────────────

    test('dy > 80 → chama onClose', () => {
        const onClose = jest.fn();
        renderHook(({ onClose }) => useSheetDismiss(onClose), { initialProps: { onClose } });
        act(() => { capturedConfig.onPanResponderRelease({}, { dy: 100, vy: 0 }); });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('vy > 0.5 → chama onClose mesmo com dy pequeno', () => {
        const onClose = jest.fn();
        renderHook(({ onClose }) => useSheetDismiss(onClose), { initialProps: { onClose } });
        act(() => { capturedConfig.onPanResponderRelease({}, { dy: 20, vy: 0.6 }); });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('dy = 81 (acima do limite) → chama onClose', () => {
        const onClose = jest.fn();
        renderHook(({ onClose }) => useSheetDismiss(onClose), { initialProps: { onClose } });
        act(() => { capturedConfig.onPanResponderRelease({}, { dy: 81, vy: 0 }); });
        expect(onClose).toHaveBeenCalled();
    });

    test('dy pequeno + vy baixo → NÃO chama onClose', () => {
        const onClose = jest.fn();
        renderHook(({ onClose }) => useSheetDismiss(onClose), { initialProps: { onClose } });
        act(() => { capturedConfig.onPanResponderRelease({}, { dy: 30, vy: 0.1 }); });
        expect(onClose).not.toHaveBeenCalled();
    });

    test('dy pequeno + vy baixo → spring chamado para voltar ao 0', () => {
        const onClose = jest.fn();
        renderHook(({ onClose }) => useSheetDismiss(onClose), { initialProps: { onClose } });
        act(() => { capturedConfig.onPanResponderRelease({}, { dy: 30, vy: 0.1 }); });
        expect(springMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ toValue: 0 }),
        );
    });

    test('drag para cima (dy negativo) → NÃO chama onClose', () => {
        const onClose = jest.fn();
        renderHook(({ onClose }) => useSheetDismiss(onClose), { initialProps: { onClose } });
        act(() => { capturedConfig.onPanResponderRelease({}, { dy: -100, vy: -1 }); });
        expect(onClose).not.toHaveBeenCalled();
    });

    // ── terminate ─────────────────────────────────────────────────────────────

    test('gesto interrompido (terminate) → NÃO chama onClose', () => {
        const onClose = jest.fn();
        renderHook(({ onClose }) => useSheetDismiss(onClose), { initialProps: { onClose } });
        act(() => { capturedConfig.onPanResponderTerminate?.({}, {}); });
        expect(onClose).not.toHaveBeenCalled();
    });

    test('gesto interrompido (terminate) → spring chamado para voltar ao 0', () => {
        const onClose = jest.fn();
        renderHook(({ onClose }) => useSheetDismiss(onClose), { initialProps: { onClose } });
        act(() => { capturedConfig.onPanResponderTerminate?.({}, {}); });
        expect(springMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ toValue: 0 }),
        );
    });

    // ── shouldSet ─────────────────────────────────────────────────────────────

    test('onMoveShouldSetPanResponder: dy > 2 → true', () => {
        const onClose = jest.fn();
        renderHook(({ onClose }) => useSheetDismiss(onClose), { initialProps: { onClose } });
        expect(capturedConfig.onMoveShouldSetPanResponder?.({}, { dy: 5 })).toBe(true);
    });

    test('onMoveShouldSetPanResponder: dy <= 2 → false', () => {
        const onClose = jest.fn();
        renderHook(({ onClose }) => useSheetDismiss(onClose), { initialProps: { onClose } });
        expect(capturedConfig.onMoveShouldSetPanResponder?.({}, { dy: 1 })).toBe(false);
    });

    // ── stale closure: onClose atualizado entre renders ───────────────────────

    test('onClose atualizado após rerender é chamado, não o anterior', () => {
        const firstClose = jest.fn();
        const secondClose = jest.fn();

        const { rerender } = renderHook(
            ({ onClose }) => useSheetDismiss(onClose),
            { initialProps: { onClose: firstClose } },
        );

        rerender({ onClose: secondClose });

        act(() => { capturedConfig.onPanResponderRelease({}, { dy: 100, vy: 0 }); });

        expect(secondClose).toHaveBeenCalledTimes(1);
        expect(firstClose).not.toHaveBeenCalled();
    });
});

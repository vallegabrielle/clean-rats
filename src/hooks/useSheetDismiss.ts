import { useRef } from 'react';
import { Animated, PanResponder } from 'react-native';

const SPRING = { useNativeDriver: true, damping: 20, stiffness: 120 } as const;

export function useSheetDismiss(onClose: () => void) {
    const translateY = useRef(new Animated.Value(0)).current;

    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, { dy }) => dy > 2,
            onPanResponderMove: (_, { dy }) => {
                if (dy > 0) translateY.setValue(dy);
            },
            onPanResponderRelease: (_, { dy, vy }) => {
                if (dy > 80 || vy > 0.5) {
                    onCloseRef.current();
                    translateY.setValue(0);
                } else {
                    Animated.spring(translateY, { toValue: 0, ...SPRING }).start();
                }
            },
            onPanResponderTerminate: () => {
                Animated.spring(translateY, { toValue: 0, ...SPRING }).start();
            },
        }),
    ).current;

    return { translateY, panHandlers: panResponder.panHandlers };
}

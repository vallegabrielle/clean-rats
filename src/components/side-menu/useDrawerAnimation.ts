import { useEffect, useRef } from "react";
import { Animated, PanResponder } from "react-native";
import { MENU_WIDTH } from "./styles";

const SPRING = { useNativeDriver: true, damping: 20, stiffness: 120 } as const;

export function useDrawerAnimation(
    visible: boolean,
    onOpen: () => void,
    onClose: () => void,
) {
    const translateX = useRef(new Animated.Value(-MENU_WIDTH)).current;
    const basePosition = useRef(-MENU_WIDTH);
    const translateXValue = useRef(-MENU_WIDTH);

    const onOpenRef = useRef(onOpen);
    const onCloseRef = useRef(onClose);
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;

    useEffect(() => {
        const id = translateX.addListener(({ value }) => {
            translateXValue.current = value;
        });
        return () => translateX.removeListener(id);
    }, []);

    const overlayOpacity = translateX.interpolate({
        inputRange: [-MENU_WIDTH, 0],
        outputRange: [0, 1],
    });

    useEffect(() => {
        const toValue = visible ? 0 : -MENU_WIDTH;
        if (basePosition.current === toValue) return;
        basePosition.current = toValue;
        Animated.spring(translateX, { toValue, ...SPRING }).start();
    }, [visible]);

    function snapToOpen() {
        basePosition.current = 0;
        onOpenRef.current();
        Animated.spring(translateX, { toValue: 0, ...SPRING }).start();
    }

    function snapToClose() {
        basePosition.current = -MENU_WIDTH;
        onCloseRef.current();
        Animated.spring(translateX, {
            toValue: -MENU_WIDTH,
            ...SPRING,
        }).start();
    }

    const snapToOpenRef = useRef(snapToOpen);
    const snapToCloseRef = useRef(snapToClose);
    snapToOpenRef.current = snapToOpen;
    snapToCloseRef.current = snapToClose;

    const edgePan = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, { dx, dy }) =>
                dx > 6 && Math.abs(dx) > Math.abs(dy),
            onPanResponderGrant: () => {
                basePosition.current = translateXValue.current;
            },
            onPanResponderMove: (_, { dx }) => {
                translateX.setValue(
                    Math.min(
                        0,
                        Math.max(-MENU_WIDTH, basePosition.current + dx),
                    ),
                );
            },
            onPanResponderRelease: (_, { dx, vx }) => {
                vx > 0.3 || basePosition.current + dx > -MENU_WIDTH * 0.5
                    ? snapToOpenRef.current()
                    : snapToCloseRef.current();
            },
        }),
    ).current;

    const drawerPan = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, { dx, dy }) =>
                dx < -6 && Math.abs(dx) > Math.abs(dy),
            onPanResponderGrant: () => {
                basePosition.current = translateXValue.current;
            },
            onPanResponderMove: (_, { dx }) => {
                translateX.setValue(
                    Math.min(
                        0,
                        Math.max(-MENU_WIDTH, basePosition.current + dx),
                    ),
                );
            },
            onPanResponderRelease: (_, { dx, vx }) => {
                vx < -0.3 || basePosition.current + dx < -MENU_WIDTH * 0.5
                    ? snapToCloseRef.current()
                    : snapToOpenRef.current();
            },
        }),
    ).current;

    return { translateX, overlayOpacity, edgePan, drawerPan, snapToClose };
}

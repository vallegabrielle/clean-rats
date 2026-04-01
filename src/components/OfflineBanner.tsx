import { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { COLORS } from "../constants";

export function OfflineBanner() {
    const { isOnline } = useNetworkStatus();
    const translateY = useRef(new Animated.Value(-60)).current;
    const insets = useSafeAreaInsets();

    useEffect(() => {
        Animated.spring(translateY, {
            toValue: isOnline ? -60 : insets.top,
            useNativeDriver: true,
            bounciness: 0,
        }).start();
    }, [isOnline, insets.top]);

    return (
        <Animated.View
            style={[styles.banner, { transform: [{ translateY }] }]}
            pointerEvents="none"
        >
            <Text style={styles.text}>Sem conexão com a internet</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    banner: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9998,
        backgroundColor: "#555",
        paddingVertical: 8,
        alignItems: "center",
    },
    text: {
        color: COLORS.text,
        fontSize: 12,
        fontFamily: "NotoSansMono_400Regular",
    },
});

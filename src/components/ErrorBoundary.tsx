import { Component, ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../constants";

type Props = { children: ReactNode };
type State = { hasError: boolean; error: string; stack: string };

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: "", stack: "" };

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error: error?.message ?? String(error),
            stack: error?.stack ?? "",
        };
    }

    componentDidCatch(error: Error, info: { componentStack: string }) {
        console.error("[ErrorBoundary] error:", error);
        console.error("[ErrorBoundary] componentStack:", info.componentStack);
    }

    reset = () => this.setState({ hasError: false, error: "", stack: "" });

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <View style={styles.container}>
                <Text style={styles.title}>Algo deu errado</Text>
                <Text style={styles.errorMsg}>{this.state.error}</Text>
                <Text style={styles.stack} numberOfLines={12}>{this.state.stack}</Text>
                <TouchableOpacity style={styles.button} onPress={this.reset}>
                    <Text style={styles.buttonText}>Tentar novamente</Text>
                </TouchableOpacity>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 16,
    },
    title: {
        color: COLORS.text,
        fontSize: 20,
        fontFamily: "Bungee_400Regular",
    },
    errorMsg: {
        color: COLORS.red,
        fontSize: 13,
        textAlign: "center",
        fontFamily: "NotoSansMono_400Regular",
    },
    stack: {
        color: COLORS.textMuted,
        fontSize: 10,
        textAlign: "left",
        fontFamily: "NotoSansMono_400Regular",
        marginTop: 8,
    },
    button: {
        marginTop: 8,
        backgroundColor: COLORS.red,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    buttonText: {
        color: COLORS.text,
        fontFamily: "NotoSansMono_400Regular",
        fontSize: 14,
    },
});

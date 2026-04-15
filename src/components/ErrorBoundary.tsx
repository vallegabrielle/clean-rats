import { Component, ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../constants";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: { componentStack: string }) {
        console.error("[ErrorBoundary]", error, info.componentStack);
    }

    reset = () => this.setState({ hasError: false });

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <View style={styles.container}>
                <Text style={styles.title}>Algo deu errado</Text>
                <Text style={styles.message}>Ocorreu um erro inesperado.</Text>
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
    message: {
        color: COLORS.textMuted,
        fontSize: 13,
        textAlign: "center",
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

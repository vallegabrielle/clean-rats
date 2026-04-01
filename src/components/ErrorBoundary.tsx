import { Component, ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../constants";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, message: "" };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, message: error.message };
    }

    componentDidCatch(error: Error) {
        console.error("[ErrorBoundary]", error);
    }

    reset = () => this.setState({ hasError: false, message: "" });

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <View style={styles.container}>
                <Text style={styles.title}>Algo deu errado</Text>
                <Text style={styles.message}>{this.state.message}</Text>
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

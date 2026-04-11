import { useEffect, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Image,
    Platform,
} from "react-native";
import * as Haptics from 'expo-haptics';
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { AntDesign } from "@expo/vector-icons";
import { COLORS } from "../constants";
import { useAuth } from "../contexts/AuthContext";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!;
const GOOGLE_IOS_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID!;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID!;

export default function LoginScreen() {
    const { loginWithGoogle, loginWithApple } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iosClientId: GOOGLE_IOS_CLIENT_ID,
        androidClientId: GOOGLE_ANDROID_CLIENT_ID,
        redirectUri: 'com.googleusercontent.apps.1010162142223-a3n3dn0vmhhto5plek0pli1f6n2pqohv:/oauth2redirect',
    });

    useEffect(() => {
        if (response?.type === "success") {
            const idToken = response.params.id_token;
            if (!idToken) {
                setError("Não foi possível obter o token do Google.");
                return;
            }
            setLoading(true);
            loginWithGoogle(idToken).catch(() => {
                setError("Erro ao entrar com Google. Tente novamente.");
                setLoading(false);
            });
        } else if (response?.type === "error") {
            setError("Erro ao entrar com Google. Tente novamente.");
        }
    }, [response]);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.top}>
                <Image source={require('../../assets/cleaner_rat.png')} style={styles.logo} />
                <Text style={styles.title}>Clean Rats</Text>
                <Text style={styles.subtitle}>
                    Organize sua toca com a galera
                </Text>
            </View>

            <View style={styles.bottom}>
                {!!error && <Text style={styles.error}>{error}</Text>}

                {loading ? (
                    <ActivityIndicator color="#fff" size="large" />
                ) : (
                    <>
                        <TouchableOpacity
                            style={[styles.googleBtn, !request && styles.googleBtnDisabled]}
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setError(""); promptAsync(); }}
                            disabled={!request}
                        >
                            <AntDesign name="google" size={22} color="#4285F4" />
                            <Text style={styles.googleBtnText}>Entrar com Google</Text>
                        </TouchableOpacity>

                        {Platform.OS === "ios" && (
                            <TouchableOpacity
                                style={styles.googleBtn}
                                onPress={async () => {
                                    try {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setError("");
                                        setLoading(true);
                                        await loginWithApple();
                                    } catch (e: any) {
                                        if (e.code !== "ERR_REQUEST_CANCELED") {
                                            console.error("[Apple Login] code:", e.code, "message:", e.message, e);
                                            setError("Erro ao entrar com Apple. Tente novamente.");
                                        }
                                        setLoading(false);
                                    }
                                }}
                            >
                                <AntDesign name="apple" size={22} color="#000" />
                                <Text style={styles.googleBtnText}>Entrar com Apple</Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.red,
        paddingHorizontal: 32,
        paddingBottom: 52,
        paddingTop: 60,
        justifyContent: "space-between",
    },
    top: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    logo: {
        width: 160,
        height: 160,
        borderRadius: 28,
        marginBottom: 8,
    },
    title: {
        fontSize: 44,
        fontFamily: "Bungee_400Regular",
        color: "#fff",
    },
    subtitle: {
        fontSize: 15,
        fontFamily: "NotoSansMono_400Regular",
        color: "rgba(255,255,255,0.7)",
        textAlign: "center",
    },
    bottom: {
        gap: 16,
        alignItems: "center",
    },
    error: {
        fontFamily: "NotoSansMono_400Regular",
        fontSize: 13,
        color: "#ffe0e0",
        textAlign: "center",
    },
    googleBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        gap: 14,
        width: "100%",
        justifyContent: "center",
    },
    googleBtnDisabled: {
        opacity: 0.6,
    },
    googleBtnText: {
        fontSize: 16,
        fontFamily: "NotoSansMono_400Regular",
        color: "#333",
    },
    googleIcon: {
        width: 26,
        height: 26,
    },
});

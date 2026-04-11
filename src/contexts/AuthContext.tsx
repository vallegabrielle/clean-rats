import { create } from "zustand";
import {
    User,
    onAuthStateChanged,
    signOut,
    GoogleAuthProvider,
    OAuthProvider,
    signInWithCredential,
    updateProfile,
    deleteUser,
} from "firebase/auth";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { auth } from "../services/firebase";
import { sanitizeName } from "../utils";
import { clearAllData } from "../services/storage";

interface AuthState {
    user: User | null;
    loading: boolean;
    loginWithGoogle: (idToken: string) => Promise<void>;
    loginWithApple: () => Promise<void>;
    logout: () => Promise<void>;
    updateDisplayName: (name: string) => Promise<void>;
    deleteAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
    user: null,
    loading: true,

    loginWithGoogle: async (idToken) => {
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
    },

    loginWithApple: async () => {
        const rawNonce = Crypto.randomUUID();
        const hashedNonce = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            rawNonce,
        );
        const result = await AppleAuthentication.signInAsync({
            requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
            nonce: hashedNonce,
        });
        const { identityToken, fullName } = result;
        if (!identityToken) throw new Error("Apple Sign-In: sem identity token");
        const provider = new OAuthProvider("apple.com");
        const credential = provider.credential({ idToken: identityToken, rawNonce });
        const { user } = await signInWithCredential(auth, credential);
        // Apple only sends fullName on the first authentication.
        // Save it immediately — subsequent logins return fullName as null.
        if (!user.displayName) {
            const name = [fullName?.givenName, fullName?.familyName]
                .filter(Boolean)
                .join(" ")
                .trim();
            if (name) {
                await updateProfile(user, { displayName: sanitizeName(name) });
            }
        }
    },

    logout: async () => {
        await signOut(auth);
    },

    deleteAccount: async () => {
        const { user } = get();
        if (!user) return;
        const { useHouseStore } = await import("./HouseContext");
        const { houses, leaveHouse } = useHouseStore.getState();
        await Promise.all(houses.map((h) => leaveHouse(h.id)));
        await clearAllData();
        await deleteUser(user);
    },

    updateDisplayName: async (name) => {
        const { user } = get();
        if (!user) return;
        const clean = sanitizeName(name);
        await updateProfile(user, { displayName: clean });
        set((s) => ({
            user: s.user
                ? ({ ...s.user, displayName: clean } as User)
                : null,
        }));
    },
}));

onAuthStateChanged(
    auth,
    (u) => useAuthStore.setState({ user: u, loading: false }),
    (error) => {
        console.error('[Auth] onAuthStateChanged error:', error);
        useAuthStore.setState({ user: null, loading: false });
    }
);

export function useAuth() {
    const { user, loading, loginWithGoogle, loginWithApple, logout, updateDisplayName, deleteAccount } =
        useAuthStore();
    return {
        user,
        isAuthenticated: !!user,
        loading,
        loginWithGoogle,
        loginWithApple,
        logout,
        updateDisplayName,
        deleteAccount,
    };
}

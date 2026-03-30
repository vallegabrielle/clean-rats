import { create } from "zustand";
import {
    User,
    onAuthStateChanged,
    signOut,
    GoogleAuthProvider,
    signInWithCredential,
    updateProfile,
} from "firebase/auth";
import { auth } from "../services/firebase";

interface AuthState {
    user: User | null;
    loading: boolean;
    loginWithGoogle: (idToken: string) => Promise<void>;
    logout: () => Promise<void>;
    updateDisplayName: (name: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
    user: null,
    loading: true,

    loginWithGoogle: async (idToken) => {
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
    },

    logout: async () => {
        await signOut(auth);
    },

    updateDisplayName: async (name) => {
        const { user } = get();
        if (!user) return;
        await updateProfile(user, { displayName: name.trim() });
        set((s) => ({
            user: s.user
                ? ({ ...s.user, displayName: name.trim() } as User)
                : null,
        }));
    },
}));

onAuthStateChanged(auth, (u) =>
    useAuthStore.setState({ user: u, loading: false }),
);

export function useAuth() {
    const { user, loading, loginWithGoogle, logout, updateDisplayName } =
        useAuthStore();
    return {
        user,
        isAuthenticated: !!user,
        loading,
        loginWithGoogle,
        logout,
        updateDisplayName,
    };
}

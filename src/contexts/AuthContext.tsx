import { create } from "zustand";
import {
    User,
    onAuthStateChanged,
    signOut,
    GoogleAuthProvider,
    signInWithCredential,
    updateProfile,
    deleteUser,
} from "firebase/auth";
import { auth } from "../services/firebase";
import { sanitizeName } from "../utils";

interface AuthState {
    user: User | null;
    loading: boolean;
    loginWithGoogle: (idToken: string) => Promise<void>;
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

    logout: async () => {
        await signOut(auth);
    },

    deleteAccount: async () => {
        const { user } = get();
        if (!user) return;
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

onAuthStateChanged(auth, (u) =>
    useAuthStore.setState({ user: u, loading: false }),
);

export function useAuth() {
    const { user, loading, loginWithGoogle, logout, updateDisplayName, deleteAccount } =
        useAuthStore();
    return {
        user,
        isAuthenticated: !!user,
        loading,
        loginWithGoogle,
        logout,
        updateDisplayName,
        deleteAccount,
    };
}

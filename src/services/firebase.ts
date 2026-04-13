import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import * as SecureStore from "expo-secure-store";

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Adapter that maps Firebase Auth's AsyncStorage-shaped interface to expo-secure-store.
// AFTER_FIRST_UNLOCK: tokens are accessible once the device has been unlocked after a
// reboot, which is required for session restoration on app launch.
const secureStorageAdapter = {
    getItem: (key: string) =>
        SecureStore.getItemAsync(key, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }),
    setItem: (key: string, value: string) =>
        SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }),
    removeItem: (key: string) =>
        SecureStore.deleteItemAsync(key, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }),
};

const app = initializeApp(firebaseConfig);

// ── App Check ─────────────────────────────────────────────────────────────────
// Debug builds: Firebase prints a one-time token to the Metro console.
// Register it in Firebase Console → App Check → Apps → Manage debug tokens.
// After registering, set EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN in .env.local
// to skip the one-time-token flow on subsequent runs.
//
// Production: CustomProvider.getToken below must be replaced with a real device
// attestation implementation. Options:
//   • Migrate to @react-native-firebase/app-check (recommended for bare workflow)
//   • Implement via a backend-issued custom App Check token
// Until then, unenforced mode passes through; enforced mode will reject requests.
//
// To enforce: Firebase Console → App Check → Cloud Firestore → Enforce.
// Deploy the updated firestore.rules (see comment in allow list rule) only after
// enforcement is active — otherwise the rule breaks all list queries.
if (__DEV__) {
    // Firebase JS SDK checks `global` (React Native global object) for the debug token,
    // not `globalThis`. The token is NOT logged on startup — it's generated and printed
    // the first time any Firestore request triggers an App Check token fetch.
    // Look for: "App Check debug token: XXXXXXXX-XXXX-..." in Metro console after login.
    // Copy that token, register it in Firebase Console → App Check → Apps → Debug tokens,
    // then paste it in .env.local as EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN so the
    // same token is reused on subsequent runs (avoiding re-registration each time).
    const debugToken = process.env.EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN ?? true;
    // @ts-expect-error — React Native global, not typed
    global.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
}

initializeAppCheck(app, {
    provider: new CustomProvider({
        getToken: () =>
            Promise.reject(new Error("[AppCheck] Production provider not configured.")),
    }),
    isTokenAutoRefreshEnabled: true,
});

export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(secureStorageAdapter),
});

export const db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    experimentalAutoDetectLongPolling: true,
});

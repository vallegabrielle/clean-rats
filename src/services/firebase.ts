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

export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(secureStorageAdapter),
});

export const db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    experimentalAutoDetectLongPolling: true,
});

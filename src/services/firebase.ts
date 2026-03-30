import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Preencha com os dados do seu projeto Firebase:
// Console > Project Settings > Your apps > SDK setup and configuration
const firebaseConfig = {
    apiKey: "AIzaSyBXQG5I5nOMVgjtOld3M5HaB4bjh51GFyE",
    authDomain: "clean-rats.firebaseapp.com",
    projectId: "clean-rats",
    storageBucket: "clean-rats.firebasestorage.app",
    messagingSenderId: "1010162142223",
    appId: "1:1010162142223:web:aa06e996605fe4717f677a",
    measurementId: "G-ZESJ9MYEMM",
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);

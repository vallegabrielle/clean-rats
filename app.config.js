/** @type {import('@expo/config').ExpoConfig} */
module.exports = {
    name: 'Clean Rats',
    slug: 'clean-rats',
    scheme: 'cleanrats',
    version: '1.2.0',
    orientation: 'portrait',
    icon: './assets/cleaner_rat_red_bg.png',
    userInterfaceStyle: 'dark',
    splash: {
        image: './assets/cleaner_rat.png',
        resizeMode: 'contain',
        backgroundColor: '#121212',
    },
    ios: {
        supportsTablet: true,
        bundleIdentifier: 'com.gdvll.cleanrats',
        googleServicesFile: process.env.GOOGLE_SERVICES_INFO_PLIST ?? './GoogleService-Info.plist',
        infoPlist: {
            ITSAppUsesNonExemptEncryption: false,
            NSUserTrackingUsageDescription:
                'Este identificador é usado para mostrar anúncios relevantes para você.',
        },
    },
    android: {
        adaptiveIcon: {
            backgroundColor: '#E6F4FE',
            foregroundImage: './assets/cleaner_rat_red_bg.png',
            backgroundImage: './assets/cleaner_rat_red_bg.png',
            monochromeImage: './assets/cleaner_rat_red_bg.png',
        },
        predictiveBackGestureEnabled: false,
        package: 'com.gdvll.cleanrats',
        googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    },
    web: {
        favicon: './assets/cleaner_rat_red_bg.png',
    },
    plugins: [
        '@react-native-firebase/app',
        'expo-font',
        'expo-web-browser',
        'expo-apple-authentication',
        [
            'expo-notifications',
            {
                icon: './assets/cleaner_rat_red_bg.png',
                color: '#c0392b',
            },
        ],
        [
            'react-native-google-mobile-ads',
            {
                androidAppId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ?? 'ca-app-pub-3940256099942544~3347511713',
                iosAppId: 'ca-app-pub-8864558033968402~5958335073',
            },
        ],
    ],
    extra: {
        eas: {
            projectId: '58ffff89-2dd4-4649-87b7-79630c98065b',
        },
    },
};

/** @type {import('@expo/config').ExpoConfig} */
module.exports = {
    name: 'clean-rats',
    slug: 'clean-rats',
    scheme: 'cleanrats',
    version: '1.0.0',
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
        infoPlist: {
            ITSAppUsesNonExemptEncryption: false,
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
        googleServicesFile: './google-services.json',
    },
    web: {
        favicon: './assets/cleaner_rat_red_bg.png',
    },
    plugins: [
        'expo-font',
        'expo-web-browser',
    ],
    extra: {
        eas: {
            projectId: '58ffff89-2dd4-4649-87b7-79630c98065b',
        },
    },
};

import './src/i18n';
import 'react-native-gesture-handler';
import { useEffect, useRef, useState } from 'react';
import { useFonts, Bungee_400Regular } from '@expo-google-fonts/bungee';
import { NotoSansMono_400Regular } from '@expo-google-fonts/noto-sans-mono';
import { Platform, View, ActivityIndicator } from 'react-native';
import MobileAds, { AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { initInterstitialAd } from './src/utils/adManager';
import { trackScreen } from './src/utils/analytics';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './src/contexts/AuthContext';
import { registerForPushNotifications } from './src/services/notifications';
import { HouseSync } from './src/contexts/HouseContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import CreateHouseScreen from './src/screens/CreateHouseScreen';
import TasksScreen from './src/screens/TasksScreen';
import JoinHouseScreen from './src/screens/JoinHouseScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import MembersScreen from './src/screens/MembersScreen';
import OnboardingScreen, { ONBOARDING_KEY } from './src/screens/OnboardingScreen';
import SetDisplayNameScreen from './src/screens/SetDisplayNameScreen';
import { OnboardingContext } from './src/contexts/OnboardingContext';
import { ToastProvider } from './src/components/Toast';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { OfflineBanner } from './src/components/OfflineBanner';

export type RootStackParamList = {
  Login: undefined;
  SetDisplayName: undefined;
  Home: undefined;
  CreateHouse: undefined;
  JoinHouse: { code?: string } | undefined;
  Tasks: undefined;
  History: undefined;
  Members: undefined;
};

const linking = {
  prefixes: ['cleanrats://'],
  config: {
    screens: {
      JoinHouse: 'join/:code',
    },
  },
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type AppNavigatorProps = {
  onboardingDone: boolean;
  onOnboardingDone: () => void;
};

function AppNavigator({ onboardingDone, onOnboardingDone }: AppNavigatorProps) {
  const { isAuthenticated, user } = useAuth();
  const needsDisplayName = isAuthenticated && !user?.displayName;

  if (!onboardingDone) {
    return <OnboardingScreen onDone={onOnboardingDone} />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : needsDisplayName ? (
        <Stack.Screen name="SetDisplayName" component={SetDisplayNameScreen} />
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="CreateHouse" component={CreateHouseScreen} />
          <Stack.Screen name="Tasks" component={TasksScreen} />
          <Stack.Screen name="JoinHouse" component={JoinHouseScreen} />
          <Stack.Screen name="History" component={HistoryScreen} />
          <Stack.Screen name="Members" component={MembersScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

function AppContent() {
  const { loading: authLoading, isAuthenticated, user } = useAuth();
  const navigationRef = useNavigationContainerRef();
  const [fontsLoaded] = useFonts({
    Bungee_400Regular,
    NotoSansMono_400Regular,
  });
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const adsInitialized = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setOnboardingDone(val === 'true');
    });
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.uid) return;
    registerForPushNotifications(user.uid).catch(console.error);
  }, [authLoading, isAuthenticated, user?.uid]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || adsInitialized.current) return;
    adsInitialized.current = true;

    (async () => {
      try {
        const consentInfo = await AdsConsent.requestInfoUpdate();
        if (
          consentInfo.isConsentFormAvailable &&
          consentInfo.status === AdsConsentStatus.REQUIRED
        ) {
          try { await AdsConsent.loadAndShowConsentFormIfRequired(); } catch { /* non-blocking */ }
        }
      } catch { /* non-blocking */ }

      if (Platform.OS === 'ios') {
        try { await requestTrackingPermissionsAsync(); } catch { /* non-blocking */ }
      }

      try {
        await Promise.race([
          MobileAds().initialize(),
          new Promise<void>((r) => setTimeout(r, 5000)),
        ]);
      } catch { /* non-blocking */ }
      initInterstitialAd();
    })();
  }, [authLoading, isAuthenticated]);

  if (!fontsLoaded || authLoading || onboardingDone === null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#121212', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#c0392b" />
      </View>
    );
  }

  async function resetOnboarding() {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    setOnboardingDone(false);
  }

  return (
    <OnboardingContext.Provider value={{ resetOnboarding }}>
      <NavigationContainer
          ref={navigationRef}
          linking={linking}
          onStateChange={() => {
            const route = navigationRef.getCurrentRoute();
            if (route?.name) trackScreen(route.name);
          }}
        >
        <AppNavigator
          onboardingDone={onboardingDone}
          onOnboardingDone={() => setOnboardingDone(true)}
        />
        <ToastProvider />
        <OfflineBanner />
      </NavigationContainer>
    </OnboardingContext.Provider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <HouseSync />
          <AppContent />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

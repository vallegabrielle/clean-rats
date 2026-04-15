import 'react-native-gesture-handler';
import { useEffect, useRef, useState } from 'react';
import { useFonts, Bungee_400Regular } from '@expo-google-fonts/bungee';
import { NotoSansMono_400Regular } from '@expo-google-fonts/noto-sans-mono';
import { Platform, View, ActivityIndicator } from 'react-native';
import MobileAds, { requestTrackingTransparencyPermission } from 'react-native-google-mobile-ads';
import { initInterstitialAd } from './src/utils/adManager';
import { NavigationContainer } from '@react-navigation/native';
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
import { ToastProvider, showToast } from './src/components/Toast';
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

  // Request ATT and initialize MobileAds once auth has resolved and the user
  // is authenticated. We gate on isAuthenticated so the prompt doesn't fire
  // on the cold-start loading screen or on the login screen.
  useEffect(() => {
    if (authLoading || !isAuthenticated || !fontsLoaded || onboardingDone === null || adsInitialized.current) return;
    adsInitialized.current = true;

    async function initAds() {
      if (Platform.OS === 'ios') {
        // ATT prompt — must be shown before initializing the SDK on iOS 14+.
        // The result doesn't block SDK init; AdMob will serve limited ads if
        // the user denies.
        await requestTrackingTransparencyPermission();
      }
      await MobileAds().initialize();
      initInterstitialAd();
    }

    initAds().catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(`[AD] init falhou: ${msg}`, 'error');
    });
  }, [authLoading, isAuthenticated, fontsLoaded, onboardingDone]);

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
      <NavigationContainer linking={linking}>
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

import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { useFonts, Bungee_400Regular } from '@expo-google-fonts/bungee';
import { NotoSansMono_400Regular } from '@expo-google-fonts/noto-sans-mono';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './src/contexts/AuthContext';
import { HouseSync } from './src/contexts/HouseContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import CreateHouseScreen from './src/screens/CreateHouseScreen';
import TasksScreen from './src/screens/TasksScreen';
import JoinHouseScreen from './src/screens/JoinHouseScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import MembersScreen from './src/screens/MembersScreen';
import OnboardingScreen, { ONBOARDING_KEY } from './src/screens/OnboardingScreen';
import { OnboardingContext } from './src/contexts/OnboardingContext';
import { ToastProvider } from './src/components/Toast';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { OfflineBanner } from './src/components/OfflineBanner';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  CreateHouse: undefined;
  JoinHouse: undefined;
  Tasks: undefined;
  History: undefined;
  Members: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type AppNavigatorProps = {
  onboardingDone: boolean;
  onOnboardingDone: () => void;
};

function AppNavigator({ onboardingDone, onOnboardingDone }: AppNavigatorProps) {
  const { isAuthenticated } = useAuth();

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
  const { loading: authLoading } = useAuth();
  const [fontsLoaded] = useFonts({
    Bungee_400Regular,
    NotoSansMono_400Regular,
  });
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setOnboardingDone(val === 'true');
    });
  }, []);

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
      <NavigationContainer>
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

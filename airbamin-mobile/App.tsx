import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { ConnectionProvider } from './contexts/ConnectionContext';
import React from 'react';
import { useFonts } from 'expo-font';
import { ActivityIndicator, View, Text, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Screens
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import ModeSelectionScreen from './screens/ModeSelectionScreen';
import MirrorModeScreen from './screens/MirrorModeScreen';
import HostModeScreen from './screens/HostModeScreen';
import JoinModeScreen from './screens/JoinModeScreen';
import FilePickerScreen from './screens/FilePickerScreen';
import ReceiveScreen from './screens/ReceiveScreen';
import SettingsScreen from './screens/SettingsScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import ConnectScreen from './screens/ConnectScreen';
import VerifyEmailScreen from './screens/VerifyEmailScreen';
import ResetCodeScreen from './screens/ResetCodeScreen';
import NewPasswordScreen from './screens/NewPasswordScreen';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Mode: undefined;
  Connect: undefined;
  Mirror: undefined;
  Host: undefined;
  Join: undefined;
  Files: undefined;
  Receive: { hostIP?: string; isPhoneTransfer?: boolean; phoneFiles?: any[] } | undefined;
  Settings: undefined;
  Privacy: { origin: 'Login' | 'Settings' };
  VerifyEmail: { email: string };
  ResetCode: { emailOrUsername: string };
  NewPassword: { emailOrUsername: string; code: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { isDark, colors } = useTheme();

  return (
    <NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="Mode" component={ModeSelectionScreen} />
        <Stack.Screen name="Connect" component={ConnectScreen} />
        <Stack.Screen name="Mirror" component={MirrorModeScreen} />
        <Stack.Screen name="Host" component={HostModeScreen} />
        <Stack.Screen name="Join" component={JoinModeScreen} />
        <Stack.Screen name="Files" component={FilePickerScreen} />
        <Stack.Screen name="Receive" component={ReceiveScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Privacy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        <Stack.Screen name="ResetCode" component={ResetCodeScreen} />
        <Stack.Screen name="NewPassword" component={NewPasswordScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  // Explicitly load icon fonts - required for Android
  const [fontsLoaded, fontError] = useFonts({
    // Load icon fonts from @expo/vector-icons
    'Feather': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf'),
    'Ionicons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
    // Also load custom app fonts
    'Baloo-Regular': require('./assets/fonts/Baloo-Regular.ttf'),
    'Baloo-Bold': require('./assets/fonts/Baloo-Bold.ttf'),
  });

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      console.log('=== FONT LOADING COMPLETE ===');
      console.log('Platform:', Platform.OS);
      console.log('Fonts loaded:', fontsLoaded);
      console.log('Font error:', fontError);
      console.log('=============================');
    }
  }, [fontsLoaded, fontError]);

  // Show loading while fonts load
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0e0f12' }}>
        <ActivityIndicator size="large" color="#0066FF" />
        <Text style={{ color: '#fff', marginTop: 16 }}>Loading fonts...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <ConnectionProvider>
            <AppProvider>
              <AppNavigator />
            </AppProvider>
          </ConnectionProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}


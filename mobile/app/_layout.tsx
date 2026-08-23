import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import {
  ThemeProvider,
  useAppTheme,
} from '@/context/ThemeContext';

function RootNavigator() {
  const { theme } = useAppTheme();
  const { status } = useAuth();

  if (status === 'loading') {
    return null;
  }

  return (
    <NavigationThemeProvider
      value={theme === 'dark' ? DarkTheme : DefaultTheme}
    >
      <Stack>
        <Stack.Protected guard={status === 'authenticated'}>
          <Stack.Screen
            name="(tabs)"
            options={{ headerShown: false }}
          />
        </Stack.Protected>

        <Stack.Protected guard={status === 'unauthenticated'}>
          <Stack.Screen
            name="login"
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="forgot-password"
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="reset-password"
            options={{ headerShown: false }}
          />
        </Stack.Protected>

        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            title: 'Modal',
          }}
        />
      </Stack>

      <StatusBar
        style={theme === 'dark' ? 'light' : 'dark'}
      />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
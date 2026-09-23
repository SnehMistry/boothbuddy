import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { SignInScreen } from '@/components/sign-in-screen';
import { useSession } from '@/hooks/use-session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { session, loading } = useSession();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {loading ? null : session ? (
        <Stack>
          <Stack.Screen name="index" options={{ title: 'BoothBuddy' }} />
          <Stack.Screen
            name="new-event"
            options={{ title: 'New Event', presentation: 'modal' }}
          />
          <Stack.Screen name="event/[id]/index" options={{ title: 'Event' }} />
          <Stack.Screen
            name="event/[id]/new-contact"
            options={{ title: 'New Contact', presentation: 'modal' }}
          />
          <Stack.Screen name="contact/[id]" options={{ title: 'Contact' }} />
        </Stack>
      ) : (
        <SignInScreen />
      )}
    </ThemeProvider>
  );
}

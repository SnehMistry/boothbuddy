import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ConfigErrorScreen } from '@/components/config-error-screen';
import { SignInScreen } from '@/components/sign-in-screen';
import { useSession } from '@/hooks/use-session';
import { supabaseConfigError } from '@/lib/supabase';
import { ThemePreferenceProvider, useThemePreference } from '@/lib/theme-preference';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <RootLayoutInner />
    </ThemePreferenceProvider>
  );
}

function RootLayoutInner() {
  const { resolvedScheme } = useThemePreference();
  const { session, loading } = useSession();

  return (
    <ThemeProvider value={resolvedScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {supabaseConfigError ? (
        <ConfigErrorScreen message={supabaseConfigError} />
      ) : loading ? null : session ? (
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="new-event"
            options={{ title: 'New Event', presentation: 'modal' }}
          />
          <Stack.Screen name="event/[id]/index" options={{ title: 'Event' }} />
          <Stack.Screen
            name="event/[id]/new-contact"
            options={{ title: 'New Contact', presentation: 'modal' }}
          />
          <Stack.Screen name="event/[id]/end-of-day" options={{ title: 'End of Day' }} />
          <Stack.Screen name="contact/[id]" options={{ title: 'Contact' }} />
        </Stack>
      ) : (
        <SignInScreen />
      )}
    </ThemeProvider>
  );
}

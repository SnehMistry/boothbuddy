import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { View, useColorScheme } from 'react-native';

import { ConfigErrorScreen } from '@/components/config-error-screen';
import { LoadingView } from '@/components/loading-view';
import { SignInScreen } from '@/components/sign-in-screen';
import { WebSidebar } from '@/components/web-sidebar';
import { useSession } from '@/hooks/use-session';
import { supabaseConfigError } from '@/lib/supabase';

// Web gets its own root layout — a persistent sidebar (event list, "+ New
// Event", sign out) next to the same Stack native uses, so a click on a
// different event swaps the right-hand pane without a full page nav. This
// is the "clean desktop layout" split from PROMPT.md: mobile stays the
// full-screen, capture-focused Stack (see _layout.tsx); web becomes a
// review-focused dashboard.
export default function WebRootLayout() {
  const colorScheme = useColorScheme();
  const { session, loading } = useSession();

  if (supabaseConfigError) return <ConfigErrorScreen message={supabaseConfigError} />;
  if (loading) return <LoadingView />;
  if (!session) return <SignInScreen />;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1, flexDirection: 'row', minHeight: '100%' }}>
        <WebSidebar />
        <View style={{ flex: 1 }}>
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
            <Stack.Screen name="event/[id]/end-of-day" options={{ title: 'End of Day' }} />
            <Stack.Screen name="contact/[id]" options={{ title: 'Contact' }} />
          </Stack>
        </View>
      </View>
    </ThemeProvider>
  );
}

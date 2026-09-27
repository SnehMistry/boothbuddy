import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getEvents } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import type { BoothEvent } from '@/lib/types';

// The persistent left nav for the web dashboard (see _layout.web.tsx) —
// mobile has no equivalent, it uses full-screen push navigation instead
// (see PROMPT.md's original "Mobile: capture-focused... Web: review-
// focused dashboard" split).
export function WebSidebar() {
  const pathname = usePathname();
  const [events, setEvents] = useState<BoothEvent[]>([]);

  // Refetch on every navigation rather than once on mount: this component
  // never unmounts (it's outside the Slot), so it has no other signal that
  // an event was just created or renamed elsewhere in the app.
  useEffect(() => {
    getEvents().then(setEvents);
  }, [pathname]);

  const handleSignOut = () => {
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  return (
    <ThemedView type="backgroundElement" style={styles.sidebar}>
      <Pressable onPress={() => router.push('/')}>
        <ThemedText type="smallBold" style={styles.title}>
          🎪 BoothBuddy
        </ThemedText>
      </Pressable>

      <Pressable
        onPress={() => router.push('/new-event')}
        style={({ pressed }) => [styles.newEventButton, pressed && styles.pressed]}>
        <ThemedText type="smallBold" style={styles.newEventButtonText}>
          + New Event
        </ThemedText>
      </Pressable>

      <ScrollView style={styles.eventList}>
        {events.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
            No events yet.
          </ThemedText>
        ) : (
          events.map((event) => {
            const active = pathname.startsWith(`/event/${event.id}`);
            return (
              <Pressable
                key={event.id}
                onPress={() => router.push(`/event/${event.id}`)}
                style={[styles.eventRow, active && styles.eventRowActive]}>
                <ThemedText type="small" style={styles.eventRowName}>
                  {event.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {event.date}
                </ThemedText>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Pressable onPress={handleSignOut} style={styles.signOutButton}>
        <ThemedText type="small" themeColor="textSecondary">
          Sign Out
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: '#60646c33',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  title: {
    fontSize: 18,
  },
  newEventButton: {
    backgroundColor: '#3c87f7',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  newEventButtonText: {
    color: '#ffffff',
  },
  eventList: {
    flex: 1,
  },
  emptyText: {
    paddingVertical: Spacing.two,
  },
  eventRow: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    gap: 2,
  },
  eventRowActive: {
    backgroundColor: '#3c87f71a',
  },
  eventRowName: {
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
  signOutButton: {
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#60646c33',
  },
});

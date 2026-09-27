import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getEvents } from '@/lib/storage';
import type { BoothEvent } from '@/lib/types';

// The events list itself lives in the persistent sidebar (_layout.web.tsx,
// web-sidebar.tsx) — this is just the landing pane shown before an event is
// selected.
export default function WebHomeScreen() {
  const [events, setEvents] = useState<BoothEvent[]>([]);

  useFocusEffect(
    useCallback(() => {
      getEvents().then(setEvents);
    }, []),
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="subtitle">Welcome back</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.body}>
        {events.length === 0
          ? 'Create your first event from the sidebar to start capturing contacts.'
          : 'Pick an event from the sidebar to review contacts, confirm research, and draft follow-ups.'}
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.six,
    gap: Spacing.two,
  },
  body: {
    maxWidth: 480,
  },
});

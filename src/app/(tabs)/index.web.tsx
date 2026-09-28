import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getEvents, getOverallStats, type OverallStats } from '@/lib/storage';
import type { BoothEvent } from '@/lib/types';

const STAT_TILES: {
  key: keyof OverallStats;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'peopleMet', label: 'People met', icon: 'people-outline' },
  { key: 'followupsSent', label: 'Follow-ups sent', icon: 'paper-plane-outline' },
  { key: 'applicationsDueThisWeek', label: 'Applications due this week', icon: 'time-outline' },
];

// The events list itself lives in the persistent sidebar (_layout.web.tsx,
// web-sidebar.tsx) — this is just the landing pane shown before an event is
// selected, with an at-a-glance stats header across every event.
export default function WebHomeScreen() {
  const theme = useTheme();
  const [events, setEvents] = useState<BoothEvent[]>([]);
  const [stats, setStats] = useState<OverallStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      getEvents().then(setEvents);
      getOverallStats().then(setStats);
    }, []),
  );

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.container}>
      <ThemedText type="display">Welcome back</ThemedText>
      <ThemedText type="body" themeColor="textMuted" style={styles.body}>
        {events.length === 0
          ? 'Create your first event from the sidebar to start capturing contacts.'
          : 'Pick an event from the sidebar to review contacts, confirm research, and draft follow-ups.'}
      </ThemedText>

      {!!stats && (
        <View style={styles.statsRow}>
          {STAT_TILES.map((tile) => (
            <View
              key={tile.key}
              style={[styles.statTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name={tile.icon} size={18} color={theme.accent} />
              <ThemedText type="display">{stats[tile.key]}</ThemedText>
              <ThemedText type="caption" themeColor="textMuted">
                {tile.label}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
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
    marginBottom: Spacing.four,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  statTile: {
    width: 180,
    padding: Spacing.four,
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.one,
  },
});

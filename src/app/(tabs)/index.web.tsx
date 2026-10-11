import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { EmptyState } from '@/components/empty-state';
import { StatTile, type StatTone } from '@/components/stat-tile';
import { ThemedText } from '@/components/themed-text';
import { BrandGradient, GradientTextOn } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getEvents, getOverallStats, type OverallStats } from '@/lib/storage';
import type { BoothEvent } from '@/lib/types';

const STAT_TILES: {
  key: keyof OverallStats;
  label: string;
  icon: 'people' | 'paper-plane' | 'alarm';
  tone: StatTone;
}[] = [
  { key: 'peopleMet', label: 'People met', icon: 'people', tone: 'accent' },
  { key: 'followupsSent', label: 'Follow-ups sent', icon: 'paper-plane', tone: 'mint' },
  { key: 'applicationsDueThisWeek', label: 'Applications due this week', icon: 'alarm', tone: 'fun' },
];

// The events list itself lives in the persistent sidebar (_layout.web.tsx,
// web-sidebar.tsx) — this is just the landing pane shown before an event is
// selected: a friendly gradient welcome banner plus at-a-glance stats
// across every event.
export default function WebHomeScreen() {
  const theme = useTheme();
  const [events, setEvents] = useState<BoothEvent[] | null>(null);
  const [stats, setStats] = useState<OverallStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      getEvents().then(setEvents);
      getOverallStats().then(setStats);
    }, []),
  );

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <LinearGradient
          colors={BrandGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.heroGradient]}
        />
        <ThemedText type="display" style={styles.heroText}>
          Welcome back 👋
        </ThemedText>
        <ThemedText type="body" style={[styles.heroText, styles.heroBody]}>
          {events?.length === 0
            ? 'Create your first event from the sidebar and start meeting people.'
            : 'Pick an event from the sidebar to catch up on contacts, confirm research, and send follow-ups.'}
        </ThemedText>
      </View>

      {!!stats && events?.length !== 0 && (
        <View style={styles.statsRow}>
          {STAT_TILES.map((tile) => (
            <StatTile
              key={tile.key}
              value={stats[tile.key]}
              label={tile.label}
              icon={tile.icon}
              tone={tile.tone === 'fun' && stats[tile.key] > 0 ? 'warning' : tile.tone}
              style={styles.statTile}
            />
          ))}
        </View>
      )}

      {events?.length === 0 && (
        <EmptyState
          emoji="🎪"
          title="Your first career fair awaits"
          body="Create an event for the fair or meetup you're heading to, then capture everyone you meet in under a minute."
          actionLabel="Create an event"
          onAction={() => router.push('/new-event')}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.five,
    gap: Spacing.four,
    maxWidth: 1000,
    width: '100%',
  },
  hero: {
    padding: Spacing.five,
    borderRadius: Radius.large + 8,
    gap: Spacing.two,
    overflow: 'hidden',
  },
  heroGradient: {
    borderRadius: Radius.large + 8,
  },
  heroText: {
    color: GradientTextOn,
  },
  heroBody: {
    maxWidth: 520,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  statTile: {
    flexGrow: 1,
    flexBasis: 180,
  },
});

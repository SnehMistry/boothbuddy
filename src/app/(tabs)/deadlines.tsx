import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { Checkbox } from '@/components/checkbox';
import { ExternalLinkRow } from '@/components/external-link-row';
import { SkeletonList } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deadlineSortKey } from '@/lib/deadlines';
import { formatHumanDate } from '@/lib/dates';
import { getUpcomingDeadlines, setJobApplied, type UpcomingDeadline } from '@/lib/storage';

// A cross-event view of every open application AI has found — the Events
// tab is organized by fair, but "what's due soon" cuts across all of them,
// so it gets its own tab instead of being buried per-event.
export default function DeadlinesScreen() {
  const theme = useTheme();
  const [deadlines, setDeadlines] = useState<UpcomingDeadline[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      getUpcomingDeadlines().then(setDeadlines);
    }, []),
  );

  const toggleApplied = (job: UpcomingDeadline) => {
    setDeadlines((prev) =>
      prev ? prev.filter((j) => j.id !== job.id) : prev,
    );
    setJobApplied(job.id, true).catch(() => {
      setDeadlines((prev) => (prev ? [...prev, job] : prev));
    });
  };

  const sorted = deadlines
    ? [...deadlines].sort((a, b) => deadlineSortKey(a.deadline) - deadlineSortKey(b.deadline))
    : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      {sorted === null ? (
        <SkeletonList />
      ) : sorted.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-done-circle-outline" size={40} color={theme.textMuted} />
          <ThemedText type="heading" style={styles.centerText}>
            Nothing due
          </ThemedText>
          <ThemedText type="body" themeColor="textMuted" style={styles.centerText}>
            Jobs AI finds while processing your contacts will show up here, soonest deadline first.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(job) => job.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card>
              <Checkbox label={item.title} checked={false} onPress={() => toggleApplied(item)} />
              <Pressable
                onPress={() => router.push(`/event/${item.eventId}`)}
                style={styles.metaRow}
                hitSlop={12}>
                <ThemedText type="caption" themeColor="accentStrong">
                  {item.contactName}
                  {item.eventName ? ` · ${item.eventName}` : ''}
                </ThemedText>
              </Pressable>
              <View style={styles.bottomRow}>
                {!!item.deadline && <Badge label={`Due ${formatHumanDate(item.deadline)}`} tone="warning" />}
                {!!item.url && <ExternalLinkRow url={item.url} label="Open" />}
              </View>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.two,
  },
  centerText: {
    textAlign: 'center',
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  metaRow: {
    marginLeft: Spacing.four,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: Spacing.four,
    marginTop: Spacing.half,
  },
});

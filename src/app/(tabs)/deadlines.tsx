import { useCallback, useState } from 'react';
import { FlatList, Pressable, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { Checkbox } from '@/components/checkbox';
import { EmptyState } from '@/components/empty-state';
import { ExternalLinkRow } from '@/components/external-link-row';
import { JobSuggestionsDisclaimer } from '@/components/job-suggestions';
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
        <EmptyState
          emoji="🏖️"
          title="Nothing due — you're all caught up"
          body="Roles the AI suggests from your conversations will land here, soonest deadline first."
          style={styles.emptyState}
        />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(job) => job.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<JobSuggestionsDisclaimer />}
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
                {!!item.url && <ExternalLinkRow url={item.url} label="Careers page" />}
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

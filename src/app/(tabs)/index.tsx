import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { SkeletonList } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatHumanDate } from '@/lib/dates';
import { getEventsWithStats, type EventWithStats } from '@/lib/storage';

export default function EventsScreen() {
  const theme = useTheme();
  const [events, setEvents] = useState<EventWithStats[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      getEventsWithStats().then(setEvents);
    }, []),
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      {events === null ? (
        <SkeletonList />
      ) : events.length === 0 ? (
        <EmptyState
          emoji="🎪"
          title="Your first career fair awaits"
          body="Create an event for the fair or meetup you're heading to, then capture everyone you meet in under a minute."
          style={styles.emptyState}
        />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(event) => event.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/event/${item.id}`)}>
              <ThemedText type="heading">{item.name}</ThemedText>
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={13} color={theme.textMuted} />
                <ThemedText type="caption" themeColor="textMuted">
                  {formatHumanDate(item.date)}
                  {item.location ? ` · ${item.location}` : ''}
                </ThemedText>
              </View>
              <View style={styles.statsRow}>
                <View style={[styles.statChip, { backgroundColor: theme.surfaceMuted }]}>
                  <Ionicons name="people-outline" size={13} color={theme.textMuted} />
                  <ThemedText type="caption" themeColor="textMuted">
                    {item.contactCount} {item.contactCount === 1 ? 'contact' : 'contacts'}
                  </ThemedText>
                </View>
                {item.pendingFollowups > 0 && (
                  <View style={[styles.statChip, { backgroundColor: theme.warningMuted }]}>
                    <Ionicons name="mail-unread-outline" size={13} color={theme.warning} />
                    <ThemedText type="caption" themeColor="warning">
                      {item.pendingFollowups} pending
                    </ThemedText>
                  </View>
                )}
              </View>
            </Card>
          )}
        />
      )}

      <Button
        label="New Event"
        icon="add"
        onPress={() => router.push('/new-event')}
        style={styles.newEventButton}
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: 'transparent',
  },
  newEventButton: {
    alignSelf: 'stretch',
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Radius.large,
  },
});

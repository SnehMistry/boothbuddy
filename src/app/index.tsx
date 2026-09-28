import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useNavigation } from 'expo-router';

import { Card } from '@/components/card';
import { ChangePasswordModal } from '@/components/change-password-modal';
import { SkeletonList } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmAction } from '@/lib/confirm';
import { getEventsWithStats, type EventWithStats } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

export default function EventsScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const [events, setEvents] = useState<EventWithStats[] | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getEventsWithStats().then(setEvents);
    }, []),
  );

  const handleSignOut = async () => {
    const confirmed = await confirmAction('Sign out?');
    if (confirmed) supabase.auth.signOut();
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerButtons}>
          <Pressable
            onPress={() => setChangingPassword(true)}
            hitSlop={8}
            accessibilityLabel="Change password">
            <Ionicons name="key-outline" size={20} color={theme.textMuted} />
          </Pressable>
          <Pressable onPress={handleSignOut} hitSlop={8} accessibilityLabel="Sign out">
            <Ionicons name="log-out-outline" size={20} color={theme.textMuted} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, theme]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      {events === null ? (
        <SkeletonList />
      ) : events.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={40} color={theme.textMuted} />
          <ThemedText type="heading" style={styles.centerText}>
            No events yet
          </ThemedText>
          <ThemedText type="body" themeColor="textMuted" style={styles.centerText}>
            Create an event for the career fair or networking session you&apos;re attending, then
            capture a contact for every person you meet.
          </ThemedText>
        </View>
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
                  {item.date}
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

      <Pressable
        onPress={() => router.push('/new-event')}
        style={({ pressed }) => [
          styles.newEventButton,
          { backgroundColor: theme.accent },
          pressed && styles.pressed,
        ]}>
        <Ionicons name="add" size={20} color="#ffffff" />
        <ThemedText type="bodyBold" style={styles.newEventButtonText}>
          New Event
        </ThemedText>
      </Pressable>

      <ChangePasswordModal visible={changingPassword} onClose={() => setChangingPassword(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: Spacing.four,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Radius.large,
  },
  pressed: {
    opacity: 0.85,
  },
  newEventButtonText: {
    color: '#ffffff',
    fontSize: 17,
  },
});

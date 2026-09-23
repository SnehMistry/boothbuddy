import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useNavigation } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getEvents } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import type { BoothEvent } from '@/lib/types';

export default function EventsScreen() {
  const navigation = useNavigation();
  const [events, setEvents] = useState<BoothEvent[]>([]);

  useFocusEffect(
    useCallback(() => {
      getEvents().then(setEvents);
    }, []),
  );

  const handleSignOut = () => {
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleSignOut} hitSlop={8}>
          <ThemedText type="small" themeColor="textSecondary">
            Sign Out
          </ThemedText>
        </Pressable>
      ),
    });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {events.length === 0 ? (
        <ThemedView style={styles.emptyState}>
          <ThemedText type="subtitle" style={styles.centerText}>
            No events yet
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            Create an event for the career fair or networking session you&apos;re attending, then
            capture a contact for every person you meet.
          </ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(event) => event.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/event/${item.id}`)}
              style={({ pressed }) => [styles.eventCard, pressed && styles.pressed]}>
              <ThemedView type="backgroundElement" style={styles.eventCardInner}>
                <ThemedText type="smallBold">{item.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.date}
                  {item.location ? ` · ${item.location}` : ''}
                </ThemedText>
              </ThemedView>
            </Pressable>
          )}
        />
      )}

      <Pressable
        onPress={() => router.push('/new-event')}
        style={({ pressed }) => [styles.newEventButton, pressed && styles.pressed]}>
        <ThemedText type="smallBold" style={styles.newEventButtonText}>
          + New Event
        </ThemedText>
      </Pressable>
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
  eventCard: {
    borderRadius: Spacing.three,
  },
  eventCardInner: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
  newEventButton: {
    backgroundColor: '#3c87f7',
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  newEventButtonText: {
    color: '#ffffff',
  },
});

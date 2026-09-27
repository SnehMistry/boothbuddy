import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getContactsForEvent, getEvent } from '@/lib/storage';
import type { BoothEvent, Contact } from '@/lib/types';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const AI_STATUS_BADGES: Record<Contact['aiStatus'], string> = {
  idle: '',
  processing: ' · ✨ Processing…',
  done: ' · ✨ Done',
  error: ' · ⚠️ AI failed',
};

export default function EventTimelineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [event, setEvent] = useState<BoothEvent | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);

  useFocusEffect(
    useCallback(() => {
      getEvent(id).then((found) => {
        setEvent(found ?? null);
        if (found) navigation.setOptions({ title: found.name });
      });
      getContactsForEvent(id).then(setContacts);
    }, [id, navigation]),
  );

  // AI processing kicks off in the background right after a contact is
  // saved (see new-contact.tsx) and can take a while — poll while anything
  // is still processing so the badge below updates without the user having
  // to leave and re-open this screen.
  useEffect(() => {
    if (!contacts.some((c) => c.aiStatus === 'processing')) return;
    const interval = setInterval(() => {
      getContactsForEvent(id).then(setContacts);
    }, 4000);
    return () => clearInterval(interval);
  }, [contacts, id]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {event && (
        <ThemedView style={styles.eventInfo}>
          <ThemedText type="small" themeColor="textSecondary">
            {event.date}
            {event.location ? ` · ${event.location}` : ''} · {contacts.length}{' '}
            {contacts.length === 1 ? 'contact' : 'contacts'}
          </ThemedText>
        </ThemedView>
      )}

      {contacts.length === 0 ? (
        <ThemedView style={styles.emptyState}>
          <ThemedText type="subtitle" style={styles.centerText}>
            No contacts yet
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            Tap &ldquo;New Contact&rdquo; right after each conversation, while it&apos;s still
            fresh.
          </ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(contact) => contact.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/contact/${item.id}`)}
              style={({ pressed }) => [styles.contactCard, pressed && styles.pressed]}>
              <ThemedView type="backgroundElement" style={styles.contactCardInner}>
                <ThemedText type="smallBold">{item.name || 'Unnamed contact'}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatTime(item.createdAt)}
                  {item.photos.length > 0 ? ` · 📷×${item.photos.length}` : ''}
                  {AI_STATUS_BADGES[item.aiStatus]}
                </ThemedText>
              </ThemedView>
            </Pressable>
          )}
        />
      )}

      <Pressable
        onPress={() => router.push(`/event/${id}/new-contact`)}
        style={({ pressed }) => [styles.newContactButton, pressed && styles.pressed]}>
        <ThemedText type="title" style={styles.newContactButtonText}>
          + New Contact
        </ThemedText>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  eventInfo: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
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
  contactCard: {
    borderRadius: Spacing.three,
  },
  contactCardInner: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
  newContactButton: {
    backgroundColor: '#3c87f7',
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
    alignItems: 'center',
  },
  newContactButtonText: {
    color: '#ffffff',
    fontSize: 20,
    lineHeight: 24,
  },
});

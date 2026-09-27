import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useContactFilter, type InterestFilter } from '@/hooks/use-contact-filter';
import { useTheme } from '@/hooks/use-theme';
import { getContactsForEvent, getEvent } from '@/lib/storage';
import { INTEREST_LEVELS, type BoothEvent, type Contact } from '@/lib/types';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const AI_STATUS_BADGES: Record<Contact['aiStatus'], string> = {
  idle: '',
  processing: ' · ✨ Processing…',
  done: ' · ✨ Done',
  error: ' · ⚠️ AI failed',
};

const INTEREST_FILTER_LABELS: Record<InterestFilter, string> = {
  all: 'All',
  hot: '🔥 Hot',
  warm: '🌤️ Warm',
  cold: '❄️ Cold',
};

export default function EventTimelineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const theme = useTheme();
  const [event, setEvent] = useState<BoothEvent | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const { filtered, search, setSearch, interestFilter, setInterestFilter } =
    useContactFilter(contacts);

  useFocusEffect(
    useCallback(() => {
      getEvent(id).then((found) => {
        setEvent(found ?? null);
        if (found) {
          navigation.setOptions({
            title: found.name,
            headerRight: () => (
              <Pressable onPress={() => router.push(`/event/${id}/end-of-day`)} hitSlop={8}>
                <ThemedText type="link" themeColor="textSecondary">
                  End of Day
                </ThemedText>
              </Pressable>
            ),
          });
        }
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
        <>
          <ThemedView style={styles.searchBar}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search name or company…"
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <ThemedView style={styles.filterRow}>
              {(['all', ...INTEREST_LEVELS] as InterestFilter[]).map((level) => (
                <Pressable
                  key={level}
                  onPress={() => setInterestFilter(level)}
                  style={[styles.filterChip, interestFilter === level && styles.filterChipSelected]}>
                  <ThemedText type="small">{INTEREST_FILTER_LABELS[level]}</ThemedText>
                </Pressable>
              ))}
            </ThemedView>
          </ThemedView>
          {filtered.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
              No contacts match.
            </ThemedText>
          ) : (
            <FlatList
              data={filtered}
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
        </>
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
  searchBar: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  searchInput: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  filterChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
    borderWidth: 1,
    borderColor: '#60646c55',
  },
  filterChipSelected: {
    borderColor: '#3c87f7',
    borderWidth: 2,
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

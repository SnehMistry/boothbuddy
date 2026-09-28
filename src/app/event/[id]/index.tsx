import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';

import { Avatar } from '@/components/avatar';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { InterestBadge } from '@/components/interest-picker';
import { SkeletonList } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useContactFilter, type InterestFilter } from '@/hooks/use-contact-filter';
import { useTheme } from '@/hooks/use-theme';
import { confirmAction } from '@/lib/confirm';
import { deleteEvent, getContactsForEvent, getEvent } from '@/lib/storage';
import { INTEREST_LEVELS, type BoothEvent, type Contact } from '@/lib/types';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const INTEREST_FILTER_LABELS: Record<InterestFilter, string> = {
  all: 'All',
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
};

function AiStatusIcon({ status }: { status: Contact['aiStatus'] }) {
  const theme = useTheme();
  if (status === 'processing') return <ActivityIndicator size="small" color={theme.accent} />;
  if (status === 'done') return <Ionicons name="checkmark-circle" size={16} color={theme.success} />;
  if (status === 'error') return <Ionicons name="alert-circle" size={16} color={theme.danger} />;
  return null;
}

export default function EventTimelineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const theme = useTheme();
  const [event, setEvent] = useState<BoothEvent | null>(null);
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const { filtered, search, setSearch, interestFilter, setInterestFilter } = useContactFilter(
    contacts ?? [],
  );

  const handleDeleteEvent = useCallback(
    async (eventName: string) => {
      const confirmed = await confirmAction(
        'Delete this event?',
        `${eventName} and all of its contacts, photos, and drafts will be permanently deleted.`,
      );
      if (!confirmed) return;
      try {
        await deleteEvent(id);
        router.replace('/');
      } catch (error) {
        Alert.alert(
          "Couldn't delete event",
          error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        );
      }
    },
    [id],
  );

  useFocusEffect(
    useCallback(() => {
      getEvent(id).then((found) => {
        setEvent(found ?? null);
        if (found) {
          navigation.setOptions({
            title: found.name,
            headerRight: () => (
              <View style={styles.headerButtons}>
                <Pressable onPress={() => router.push(`/event/${id}/end-of-day`)} hitSlop={8}>
                  <Ionicons name="moon-outline" size={20} color={theme.textMuted} />
                </Pressable>
                <Pressable onPress={() => handleDeleteEvent(found.name)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={20} color={theme.danger} />
                </Pressable>
              </View>
            ),
          });
        }
      });
      getContactsForEvent(id).then(setContacts);
    }, [id, navigation, handleDeleteEvent, theme]),
  );

  // AI processing kicks off in the background right after a contact is
  // saved (see new-contact.tsx) and can take a while — poll while anything
  // is still processing so the badge below updates without the user having
  // to leave and re-open this screen.
  useEffect(() => {
    if (!contacts?.some((c) => c.aiStatus === 'processing')) return;
    const interval = setInterval(() => {
      getContactsForEvent(id).then(setContacts);
    }, 4000);
    return () => clearInterval(interval);
  }, [contacts, id]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      {event && (
        <View style={styles.eventInfo}>
          <ThemedText type="caption" themeColor="textMuted">
            {event.date}
            {event.location ? ` · ${event.location}` : ''} · {contacts?.length ?? 0}{' '}
            {(contacts?.length ?? 0) === 1 ? 'contact' : 'contacts'}
          </ThemedText>
        </View>
      )}

      {contacts === null ? (
        <SkeletonList />
      ) : contacts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={40} color={theme.textMuted} />
          <ThemedText type="heading" style={styles.centerText}>
            No contacts yet
          </ThemedText>
          <ThemedText type="body" themeColor="textMuted" style={styles.centerText}>
            Tap &ldquo;New Contact&rdquo; right after each conversation, while it&apos;s still
            fresh.
          </ThemedText>
        </View>
      ) : (
        <>
          <View style={styles.searchBar}>
            <View style={[styles.searchInputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="search" size={16} color={theme.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search name or company…"
                placeholderTextColor={theme.textMuted}
                style={[styles.searchInput, { color: theme.text }]}
              />
            </View>
            <View style={styles.filterRow}>
              {(['all', ...INTEREST_LEVELS] as InterestFilter[]).map((level) => (
                <Chip
                  key={level}
                  label={INTEREST_FILTER_LABELS[level]}
                  selected={interestFilter === level}
                  onPress={() => setInterestFilter(level)}
                />
              ))}
            </View>
          </View>
          {filtered.length === 0 ? (
            <ThemedText type="body" themeColor="textMuted" style={styles.centerText}>
              No contacts match.
            </ThemedText>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(contact) => contact.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <Card onPress={() => router.push(`/contact/${item.id}`)} style={styles.contactCard}>
                  <Avatar name={item.name || '?'} size={40} />
                  <View style={styles.contactInfo}>
                    <ThemedText type="bodyBold" numberOfLines={1}>
                      {item.name || 'Unnamed contact'}
                    </ThemedText>
                    <View style={styles.contactMetaRow}>
                      <ThemedText type="caption" themeColor="textMuted">
                        {item.company ? `${item.company} · ` : ''}
                        {formatTime(item.createdAt)}
                        {item.photos.length > 0 ? ` · ${item.photos.length} photo${item.photos.length === 1 ? '' : 's'}` : ''}
                      </ThemedText>
                    </View>
                  </View>
                  {item.interestLevel && <InterestBadge level={item.interestLevel} />}
                  <AiStatusIcon status={item.aiStatus} />
                </Card>
              )}
            />
          )}
        </>
      )}

      <Pressable
        onPress={() => router.push(`/event/${id}/new-contact`)}
        style={({ pressed }) => [
          styles.newContactButton,
          { backgroundColor: theme.accent },
          pressed && styles.pressed,
        ]}>
        <Ionicons name="add" size={22} color="#ffffff" />
        <ThemedText type="heading" style={styles.newContactButtonText}>
          New Contact
        </ThemedText>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerButtons: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
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
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Radius.medium,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  contactInfo: {
    flex: 1,
    gap: 2,
  },
  contactMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  newContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Radius.large,
  },
  newContactButtonText: {
    color: '#ffffff',
  },
});

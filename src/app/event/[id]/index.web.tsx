import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { AiErrorNotice } from '@/components/ai-error-notice';
import { FollowupCard } from '@/components/followup-card';
import { LoadingView } from '@/components/loading-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useContactFilter, type InterestFilter } from '@/hooks/use-contact-filter';
import { useTheme } from '@/hooks/use-theme';
import { describeAiError } from '@/lib/ai-errors';
import {
  generateFollowup,
  getContactsForEvent,
  getEvent,
  processContact,
  setResearchMatchStatus,
  updateContact,
} from '@/lib/storage';
import { INTEREST_LEVELS, type BoothEvent, type Contact, type FollowupTone, type InterestLevel } from '@/lib/types';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

const INTEREST_LABELS: Record<InterestLevel, string> = {
  hot: '🔥 Hot',
  warm: '🌤️ Warm',
  cold: '❄️ Cold',
};

const INTEREST_FILTER_LABELS: Record<InterestFilter, string> = {
  all: 'All',
  ...INTEREST_LABELS,
};

const AI_STATUS_LABELS: Record<Contact['aiStatus'], string> = {
  idle: '—',
  processing: '✨ Processing…',
  done: '✨ Done',
  error: '⚠️ Failed',
};

function ContactDetailPanel({
  contact,
  processing,
  generating,
  copiedKey,
  onCopy,
  onProcess,
  onRegenerateFollowup,
  onFollowupStatusChange,
  onInterestChange,
  onMatchStatus,
}: {
  contact: Contact;
  processing: boolean;
  generating: boolean;
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
  onProcess: (contact: Contact) => void;
  onRegenerateFollowup: (contact: Contact, tone: FollowupTone) => void;
  onFollowupStatusChange: Parameters<typeof FollowupCard>[0]['onStatusChange'];
  onInterestChange: (contact: Contact, level: InterestLevel) => void;
  onMatchStatus: (contact: Contact, status: 'confirmed' | 'rejected') => void;
}) {
  return (
    <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
      <ThemedText type="subtitle">{contact.name || 'Unnamed contact'}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Captured {formatDateTime(contact.createdAt)}
        {contact.title || contact.company
          ? ` · ${[contact.title, contact.company].filter(Boolean).join(' at ')}`
          : ''}
      </ThemedText>
      <Pressable onPress={() => router.push(`/contact/${contact.id}`)}>
        <ThemedText type="link" themeColor="textSecondary">
          Edit notes, photos & raw details →
        </ThemedText>
      </Pressable>

      <ThemedView style={styles.chipRow}>
        {INTEREST_LEVELS.map((level) => (
          <Pressable
            key={level}
            onPress={() => onInterestChange(contact, level)}
            style={[styles.chip, contact.interestLevel === level && styles.chipSelected]}>
            <ThemedText type="small">{INTEREST_LABELS[level]}</ThemedText>
          </Pressable>
        ))}
      </ThemedView>

      {contact.aiStatus === 'done' ? (
        <ThemedView type="backgroundElement" style={styles.card}>
          {!!contact.summary && <ThemedText type="small">{contact.summary}</ThemedText>}
          {!!contact.topics?.length && (
            <ThemedView style={styles.chipRow}>
              {contact.topics.map((topic) => (
                <ThemedView key={topic} type="backgroundSelected" style={styles.tagChip}>
                  <ThemedText type="small">{topic}</ThemedText>
                </ThemedView>
              ))}
            </ThemedView>
          )}
          {!!contact.rolesMentioned?.length && (
            <ThemedText type="small">
              Roles: {contact.rolesMentioned.join(', ')}
            </ThemedText>
          )}
          {!!contact.deadlines?.length && (
            <ThemedText type="small">Deadlines: {contact.deadlines.join(', ')}</ThemedText>
          )}
          {!!contact.memorable && <ThemedText type="small">💭 {contact.memorable}</ThemedText>}
          {!!contact.email && (
            <Pressable onPress={() => Linking.openURL(`mailto:${contact.email}`)}>
              <ThemedText type="linkPrimary">{contact.email}</ThemedText>
            </Pressable>
          )}
          {!!contact.linkedinUrl && (
            <Pressable onPress={() => Linking.openURL(contact.linkedinUrl!)}>
              <ThemedText type="linkPrimary">{contact.linkedinUrl}</ThemedText>
            </Pressable>
          )}

          {!!contact.research && (
            <ThemedView style={styles.researchBlock}>
              <ThemedText type="smallBold">
                Research —{' '}
                {contact.research.grounded ? 'live-searched' : "AI's own knowledge only"}
              </ThemedText>
              {!!contact.research.person.summary && (
                <ThemedText type="small">
                  {contact.research.person.summary}{' '}
                  <ThemedText type="small" themeColor="textSecondary">
                    ({contact.research.person.confidence} confidence)
                  </ThemedText>
                </ThemedText>
              )}
              {!!contact.research.company.summary && (
                <ThemedText type="small">{contact.research.company.summary}</ThemedText>
              )}
              {contact.research.matchStatus === 'unconfirmed' ? (
                <ThemedView style={styles.chipRow}>
                  <Pressable
                    onPress={() => onMatchStatus(contact, 'confirmed')}
                    style={({ pressed }) => [styles.aiButton, pressed && styles.pressed]}>
                    <ThemedText type="smallBold" style={styles.aiButtonText}>
                      ✓ This is them
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => onMatchStatus(contact, 'rejected')}
                    style={({ pressed }) => [styles.rejectButton, pressed && styles.pressed]}>
                    <ThemedText type="smallBold">✗ Wrong person</ThemedText>
                  </Pressable>
                </ThemedView>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  {contact.research.matchStatus === 'confirmed' ? '✓ Confirmed' : '✗ Rejected'}
                </ThemedText>
              )}
            </ThemedView>
          )}
        </ThemedView>
      ) : (
        <>
          {contact.aiStatus === 'error' && <AiErrorNotice error={contact.aiError} />}
          <Pressable
            onPress={() => onProcess(contact)}
            disabled={processing}
            style={({ pressed }) => [styles.aiButton, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={styles.aiButtonText}>
              {processing
                ? 'AI busy, retrying…'
                : contact.aiStatus === 'error'
                  ? 'Retry'
                  : '✨ Process with AI'}
            </ThemedText>
          </Pressable>
        </>
      )}

      <ThemedText type="smallBold" style={styles.sectionSpacing}>
        Follow-up draft
      </ThemedText>
      <FollowupCard
        contact={contact}
        generating={generating}
        copiedKey={copiedKey}
        onCopy={onCopy}
        onRegenerate={onRegenerateFollowup}
        onStatusChange={onFollowupStatusChange}
      />
    </ScrollView>
  );
}

export default function EventDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const theme = useTheme();
  const [event, setEvent] = useState<BoothEvent | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { filtered, search, setSearch, interestFilter, setInterestFilter } =
    useContactFilter(contacts);

  const load = useCallback(() => {
    getEvent(id).then((found) => {
      setEvent(found ?? null);
      if (found) navigation.setOptions({ title: found.name });
    });
    getContactsForEvent(id).then(setContacts);
  }, [id, navigation]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    if (!contacts.some((c) => c.aiStatus === 'processing')) return;
    const interval = setInterval(() => getContactsForEvent(id).then(setContacts), 4000);
    return () => clearInterval(interval);
  }, [contacts, id]);

  const selected = contacts.find((c) => c.id === selectedId) ?? null;

  const handleProcess = async (contact: Contact) => {
    setProcessingId(contact.id);
    try {
      const result = await processContact(contact.id);
      setContacts((prev) =>
        prev.map((c) => (c.id === result.contact.id ? { ...c, ...result.contact } : c)),
      );
    } catch (error) {
      Alert.alert(
        "Couldn't process with AI",
        describeAiError(error instanceof Error ? error.message : undefined).headline,
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleInterestChange = async (contact: Contact, level: InterestLevel) => {
    if (contact.interestLevel === level) return;
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, interestLevel: level } : c)),
    );
    await updateContact(contact.id, { interestLevel: level }).catch(() => {});
  };

  const handleMatchStatus = async (contact: Contact, status: 'confirmed' | 'rejected') => {
    const updated = await setResearchMatchStatus(contact, status);
    if (updated) setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleCopy = async (key: string, text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500);
  };

  const handleRegenerateFollowup = async (contact: Contact, tone: FollowupTone) => {
    setGeneratingId(contact.id);
    try {
      const updated = await generateFollowup(contact.id, tone);
      setContacts((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
    } catch (error) {
      Alert.alert(
        "Couldn't draft a follow-up",
        describeAiError(error instanceof Error ? error.message : undefined).headline,
      );
    } finally {
      setGeneratingId(null);
    }
  };

  const handleFollowupStatusChange: Parameters<typeof FollowupCard>[0]['onStatusChange'] = async (
    contact,
    followupStatus,
  ) => {
    setContacts((prev) => prev.map((c) => (c.id === contact.id ? { ...c, followupStatus } : c)));
    await updateContact(contact.id, { followupStatus }).catch(() => {});
  };

  if (!event) return <LoadingView />;

  return (
    <ThemedView style={styles.root}>
      <ThemedView style={styles.tableColumn}>
        <ThemedView style={styles.toolbar}>
          <ThemedText type="small" themeColor="textSecondary">
            {event.date}
            {event.location ? ` · ${event.location}` : ''} · {contacts.length}{' '}
            {contacts.length === 1 ? 'contact' : 'contacts'}
          </ThemedText>
          <ThemedView style={styles.toolbarButtons}>
            <Pressable onPress={() => router.push(`/event/${id}/new-contact`)}>
              <ThemedText type="link">+ New Contact</ThemedText>
            </Pressable>
            <Pressable onPress={() => router.push(`/event/${id}/end-of-day`)}>
              <ThemedText type="link">End of Day →</ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.searchBar}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name or company…"
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
          <ThemedView style={styles.chipRow}>
            {(['all', ...INTEREST_LEVELS] as InterestFilter[]).map((level) => (
              <Pressable
                key={level}
                onPress={() => setInterestFilter(level)}
                style={[styles.chip, interestFilter === level && styles.chipSelected]}>
                <ThemedText type="small">{INTEREST_FILTER_LABELS[level]}</ThemedText>
              </Pressable>
            ))}
          </ThemedView>
        </ThemedView>

        {contacts.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
            No contacts yet — add one, or capture them on your phone.
          </ThemedText>
        ) : filtered.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
            No contacts match.
          </ThemedText>
        ) : (
          <ScrollView style={styles.table}>
            <ThemedView style={[styles.tableRow, styles.tableHeaderRow]}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.colName}>
                Name
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.colCompany}>
                Company
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.colInterest}>
                Interest
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.colStatus}>
                AI
              </ThemedText>
            </ThemedView>
            {filtered.map((contact) => (
              <Pressable
                key={contact.id}
                onPress={() => setSelectedId(contact.id)}
                style={[styles.tableRow, selectedId === contact.id && styles.tableRowSelected]}>
                <ThemedText type="small" style={styles.colName}>
                  {contact.name || 'Unnamed'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.colCompany}>
                  {contact.company ?? '—'}
                </ThemedText>
                <ThemedText type="small" style={styles.colInterest}>
                  {contact.interestLevel ? INTEREST_LABELS[contact.interestLevel] : '—'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.colStatus}>
                  {AI_STATUS_LABELS[contact.aiStatus]}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.divider} />

      {selected ? (
        <ContactDetailPanel
          contact={selected}
          processing={processingId === selected.id}
          generating={generatingId === selected.id}
          copiedKey={copiedKey}
          onCopy={handleCopy}
          onProcess={handleProcess}
          onRegenerateFollowup={handleRegenerateFollowup}
          onFollowupStatusChange={handleFollowupStatusChange}
          onInterestChange={handleInterestChange}
          onMatchStatus={handleMatchStatus}
        />
      ) : (
        <ThemedView style={styles.panelEmpty}>
          <ThemedText themeColor="textSecondary">
            Select a contact to review their card and draft a follow-up.
          </ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  tableColumn: {
    width: 420,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  toolbar: {
    gap: Spacing.one,
  },
  toolbarButtons: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  searchBar: {
    gap: Spacing.two,
  },
  searchInput: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  emptyText: {
    marginTop: Spacing.four,
  },
  table: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  tableHeaderRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#60646c33',
  },
  tableRowSelected: {
    backgroundColor: '#3c87f71a',
  },
  colName: {
    flex: 1.2,
    fontWeight: '700',
  },
  colCompany: {
    flex: 1,
  },
  colInterest: {
    width: 70,
  },
  colStatus: {
    width: 90,
  },
  divider: {
    width: 1,
  },
  panel: {
    flex: 1,
  },
  panelContent: {
    padding: Spacing.four,
    gap: Spacing.two,
    maxWidth: 640,
  },
  panelEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
    borderWidth: 1,
    borderColor: '#60646c55',
  },
  chipSelected: {
    borderColor: '#3c87f7',
    borderWidth: 2,
  },
  tagChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.five,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  researchBlock: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  aiButton: {
    backgroundColor: '#3c87f7',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  aiButtonText: {
    color: '#ffffff',
  },
  rejectButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: '#60646c',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.7,
  },
  sectionSpacing: {
    marginTop: Spacing.four,
  },
});

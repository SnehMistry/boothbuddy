import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { AiErrorNotice } from '@/components/ai-error-notice';
import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { ExternalLinkRow } from '@/components/external-link-row';
import { FollowupCard } from '@/components/followup-card';
import { InterestBadge, InterestPicker } from '@/components/interest-picker';
import { LoadingView } from '@/components/loading-view';
import { ThemedText } from '@/components/themed-text';
import { Toast, useToast } from '@/components/toast';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useContactFilter, type InterestFilter } from '@/hooks/use-contact-filter';
import { useTheme } from '@/hooks/use-theme';
import { confirmAction } from '@/lib/confirm';
import { isDueWithinDays } from '@/lib/deadlines';
import { describeAiError } from '@/lib/ai-errors';
import { formatDateTime, formatHumanDate } from '@/lib/dates';
import {
  deleteContact,
  deleteEvent,
  generateFollowup,
  getContactsForEvent,
  getEvent,
  getJobsForContacts,
  processContact,
  setResearchMatchStatus,
  updateContact,
} from '@/lib/storage';
import {
  INTEREST_LEVELS,
  type BoothEvent,
  type Contact,
  type FollowupTone,
  type InterestLevel,
} from '@/lib/types';

const INTEREST_FILTER_LABELS: Record<InterestFilter, string> = {
  all: 'All',
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
};

function AiStatusChip({ status, error }: { status: Contact['aiStatus']; error?: string }) {
  if (status === 'idle') return <ThemedText type="caption" themeColor="textMuted">—</ThemedText>;
  if (status === 'processing') return <Badge label="Processing…" tone="accent" />;
  if (status === 'error') return <Badge label="Failed" tone="danger" />;
  return <Badge label="Done" tone="success" />;
}

function ContactDetailPanel({
  contact,
  processing,
  generating,
  onCopy,
  onProcess,
  onRegenerateFollowup,
  onFollowupStatusChange,
  onInterestChange,
  onMatchStatus,
  onDelete,
  onBack,
}: {
  contact: Contact;
  processing: boolean;
  generating: boolean;
  onCopy: (text: string) => void;
  onProcess: (contact: Contact) => void;
  onRegenerateFollowup: (contact: Contact, tone: FollowupTone) => void;
  onFollowupStatusChange: Parameters<typeof FollowupCard>[0]['onStatusChange'];
  onInterestChange: (contact: Contact, level: InterestLevel) => void;
  onMatchStatus: (contact: Contact, status: 'confirmed' | 'rejected') => void;
  onDelete: (contact: Contact) => void;
  onBack?: () => void;
}) {
  const theme = useTheme();

  return (
    <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
      {onBack && (
        <Pressable onPress={onBack} style={styles.backRow}>
          <Ionicons name="arrow-back" size={16} color={theme.accent} />
          <ThemedText type="link" themeColor="accentStrong">
            Back to contacts
          </ThemedText>
        </Pressable>
      )}
      <View style={styles.panelHeader}>
        <Avatar name={contact.name || '?'} size={48} />
        <View style={styles.flexShrink}>
          <ThemedText type="title">{contact.name || 'Unnamed contact'}</ThemedText>
          <ThemedText type="caption" themeColor="textMuted">
            Captured {formatDateTime(contact.createdAt)}
            {contact.title || contact.company
              ? ` · ${[contact.title, contact.company].filter(Boolean).join(' at ')}`
              : ''}
          </ThemedText>
        </View>
      </View>
      {!!contact.companyUrl && <ExternalLinkRow url={contact.companyUrl} variant="chip" />}
      <Pressable onPress={() => router.push(`/contact/${contact.id}`)}>
        <ThemedText type="link" themeColor="accentStrong">
          Edit notes, photos & raw details →
        </ThemedText>
      </Pressable>

      <InterestPicker value={contact.interestLevel} onChange={(level) => onInterestChange(contact, level)} />

      {contact.aiStatus === 'done' ? (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {!!contact.summary && <ThemedText type="body">{contact.summary}</ThemedText>}
          {!!contact.topics?.length && (
            <View style={styles.chipRow}>
              {contact.topics.map((topic) => (
                <Chip key={topic} label={topic} />
              ))}
            </View>
          )}
          {!!contact.rolesMentioned?.length && (
            <View style={styles.cardSection}>
              <ThemedText type="label" themeColor="textMuted">
                <Ionicons name="briefcase-outline" size={12} /> Roles / opportunities
              </ThemedText>
              {contact.rolesMentioned.map((role, i) => (
                <ThemedText key={i} type="body">
                  • {role}
                </ThemedText>
              ))}
            </View>
          )}
          {!!contact.deadlines?.length && (
            <View style={styles.cardSection}>
              <ThemedText type="label" themeColor="textMuted">
                <Ionicons name="time-outline" size={12} /> Deadlines
              </ThemedText>
              {contact.deadlines.map((deadline, i) => (
                <Badge key={i} label={formatHumanDate(deadline)} tone="warning" />
              ))}
            </View>
          )}
          {!!contact.memorable && (
            <View style={styles.cardSection}>
              <ThemedText type="label" themeColor="textMuted">
                <Ionicons name="heart-outline" size={12} /> Memorable
              </ThemedText>
              <ThemedText type="body">{contact.memorable}</ThemedText>
            </View>
          )}
          {!!contact.email && <ExternalLinkRow url={`mailto:${contact.email}`} label={contact.email} />}
          {!!contact.linkedinUrl && <ExternalLinkRow url={contact.linkedinUrl} />}

          {!!contact.research && (
            <View style={styles.researchBlock}>
              <ThemedText type="bodyBold">
                Research —{' '}
                <ThemedText type="body" themeColor={contact.research.grounded ? 'success' : 'textMuted'}>
                  {contact.research.grounded ? 'live-searched' : "AI's own knowledge only"}
                </ThemedText>
              </ThemedText>
              {!!contact.research.person.summary && (
                <ThemedText type="body">
                  {contact.research.person.summary}{' '}
                  <ThemedText type="caption" themeColor="textMuted">
                    ({contact.research.person.confidence} confidence)
                  </ThemedText>
                </ThemedText>
              )}
              {!!contact.research.company.summary && (
                <ThemedText type="body">{contact.research.company.summary}</ThemedText>
              )}
              {contact.research.matchStatus === 'unconfirmed' ? (
                <View style={styles.chipRow}>
                  <Button label="This is them" icon="checkmark" onPress={() => onMatchStatus(contact, 'confirmed')} />
                  <Button label="Wrong person" variant="secondary" onPress={() => onMatchStatus(contact, 'rejected')} />
                </View>
              ) : (
                <Badge
                  label={contact.research.matchStatus === 'confirmed' ? 'Match confirmed' : 'Match rejected'}
                  tone={contact.research.matchStatus === 'confirmed' ? 'success' : 'neutral'}
                />
              )}
            </View>
          )}
        </View>
      ) : (
        <>
          {contact.aiStatus === 'error' && <AiErrorNotice error={contact.aiError} />}
          <Button
            label={processing ? 'AI busy, retrying…' : contact.aiStatus === 'error' ? 'Retry' : 'Process with AI'}
            icon="sparkles"
            loading={processing}
            onPress={() => onProcess(contact)}
          />
        </>
      )}

      <ThemedText type="title" style={styles.sectionSpacing}>
        Follow-up draft
      </ThemedText>
      <FollowupCard
        contact={contact}
        generating={generating}
        onCopy={onCopy}
        onRegenerate={onRegenerateFollowup}
        onStatusChange={onFollowupStatusChange}
      />

      <Button
        label="Delete Contact"
        variant="danger"
        icon="trash-outline"
        onPress={() => onDelete(contact)}
        style={styles.deleteButton}
      />
    </ScrollView>
  );
}

export default function EventDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isNarrow = width < 768;
  const [event, setEvent] = useState<BoothEvent | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [dueThisWeek, setDueThisWeek] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const { toastMessage, showToast } = useToast();
  const { filtered, search, setSearch, interestFilter, setInterestFilter } =
    useContactFilter(contacts);

  const load = useCallback(async () => {
    const [foundEvent, foundContacts] = await Promise.all([getEvent(id), getContactsForEvent(id)]);
    setEvent(foundEvent ?? null);
    setContacts(foundContacts);
    if (foundEvent) navigation.setOptions({ title: foundEvent.name });
    const foundJobs = await getJobsForContacts(foundContacts.map((c) => c.id));
    // Plain async callback, not render/an effect — Date.now() here doesn't
    // trip the render-purity lint rule the way it would in the component
    // body.
    const now = Date.now();
    setDueThisWeek(
      foundJobs.filter((job) => !job.applied && isDueWithinDays(job.deadline, 7, now)).length,
    );
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
    try {
      await updateContact(contact.id, { interestLevel: level });
    } catch (error) {
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, interestLevel: contact.interestLevel } : c)),
      );
      Alert.alert(
        "Couldn't update interest level",
        error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      );
    }
  };

  const handleMatchStatus = async (contact: Contact, status: 'confirmed' | 'rejected') => {
    const updated = await setResearchMatchStatus(contact, status);
    if (updated) setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    showToast('Copied!');
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

  const handleDeleteContact = async (contact: Contact) => {
    const confirmed = await confirmAction(
      'Delete this contact?',
      `${contact.name || 'This contact'}, their photos, and any AI research/drafts will be permanently deleted.`,
    );
    if (!confirmed) return;
    try {
      await deleteContact(contact);
      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
      setSelectedId((current) => (current === contact.id ? null : current));
    } catch (error) {
      Alert.alert(
        "Couldn't delete contact",
        error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      );
    }
  };

  const handleDeleteEvent = async () => {
    if (!event) return;
    const confirmed = await confirmAction(
      'Delete this event?',
      `${event.name} and all of its contacts, photos, and drafts will be permanently deleted.`,
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
  };

  if (!event) return <LoadingView />;

  const followupsSent = contacts.filter(
    (c) => c.followupStatus === 'sent' || c.followupStatus === 'replied',
  ).length;

  const showList = !isNarrow || !selected;
  const showDetail = !isNarrow || !!selected;

  return (
    <View style={[styles.root, isNarrow && styles.rootNarrow]}>
      {showList && (
      <View
        style={[
          styles.tableColumn,
          { borderRightColor: theme.border },
          isNarrow && styles.tableColumnNarrow,
        ]}>
        <View style={styles.toolbar}>
          <ThemedText type="caption" themeColor="textMuted">
            {formatHumanDate(event.date)}
            {event.location ? ` · ${event.location}` : ''}
          </ThemedText>
          <View style={styles.toolbarButtons}>
            <Pressable onPress={() => router.push(`/event/${id}/new-contact`)} style={styles.toolbarLink}>
              <Ionicons name="add-circle-outline" size={15} color={theme.accent} />
              <ThemedText type="link" themeColor="accentStrong">
                New Contact
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => router.push(`/event/${id}/end-of-day`)} style={styles.toolbarLink}>
              <Ionicons name="moon-outline" size={15} color={theme.accent} />
              <ThemedText type="link" themeColor="accentStrong">
                End of Day
              </ThemedText>
            </Pressable>
            <Pressable onPress={handleDeleteEvent} style={styles.toolbarLink}>
              <Ionicons name="trash-outline" size={15} color={theme.danger} />
              <ThemedText type="link" themeColor="dangerStrong">
                Delete
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ThemedText type="title">{contacts.length}</ThemedText>
            <ThemedText type="caption" themeColor="textMuted">
              People met
            </ThemedText>
          </View>
          <View style={[styles.statTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ThemedText type="title">{followupsSent}</ThemedText>
            <ThemedText type="caption" themeColor="textMuted">
              Follow-ups sent
            </ThemedText>
          </View>
          <View style={[styles.statTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ThemedText type="title" themeColor={dueThisWeek > 0 ? 'warning' : 'text'}>
              {dueThisWeek}
            </ThemedText>
            <ThemedText type="caption" themeColor="textMuted">
              Due this week
            </ThemedText>
          </View>
        </View>

        <View style={[styles.searchInputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="search" size={15} color={theme.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name or company…"
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.text }]}
          />
        </View>
        <View style={styles.chipRow}>
          {(['all', ...INTEREST_LEVELS] as InterestFilter[]).map((level) => (
            <Chip
              key={level}
              label={INTEREST_FILTER_LABELS[level]}
              selected={interestFilter === level}
              onPress={() => setInterestFilter(level)}
            />
          ))}
        </View>

        {contacts.length === 0 ? (
          <ThemedText type="body" themeColor="textMuted" style={styles.emptyText}>
            No contacts yet — add one, or capture them on your phone.
          </ThemedText>
        ) : filtered.length === 0 ? (
          <ThemedText type="body" themeColor="textMuted" style={styles.emptyText}>
            No contacts match.
          </ThemedText>
        ) : (
          <ScrollView style={styles.table}>
            {filtered.map((contact) => (
              <Pressable
                key={contact.id}
                onPress={() => setSelectedId(contact.id)}
                style={({ hovered }: { hovered?: boolean }) => [
                  styles.tableRow,
                  selectedId === contact.id
                    ? { backgroundColor: theme.accentMuted }
                    : hovered && { backgroundColor: theme.surfaceMuted },
                ]}>
                <Avatar name={contact.name || '?'} size={32} />
                <View style={styles.colName}>
                  <ThemedText type="bodyBold" numberOfLines={1}>
                    {contact.name || 'Unnamed'}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
                    {contact.company ?? '—'}
                  </ThemedText>
                </View>
                {contact.interestLevel && <InterestBadge level={contact.interestLevel} />}
                <AiStatusChip status={contact.aiStatus} />
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
      )}

      {showDetail && (selected ? (
        <ContactDetailPanel
          contact={selected}
          processing={processingId === selected.id}
          generating={generatingId === selected.id}
          onCopy={handleCopy}
          onProcess={handleProcess}
          onRegenerateFollowup={handleRegenerateFollowup}
          onFollowupStatusChange={handleFollowupStatusChange}
          onInterestChange={handleInterestChange}
          onMatchStatus={handleMatchStatus}
          onDelete={handleDeleteContact}
          onBack={isNarrow ? () => setSelectedId(null) : undefined}
        />
      ) : (
        <View style={styles.panelEmpty}>
          <Ionicons name="person-circle-outline" size={40} color={theme.textMuted} />
          <ThemedText type="body" themeColor="textMuted">
            Select a contact to review their card and draft a follow-up.
          </ThemedText>
        </View>
      ))}
      <Toast message={toastMessage} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  rootNarrow: {
    flexDirection: 'column',
  },
  tableColumn: {
    width: 420,
    padding: Spacing.three,
    gap: Spacing.two,
    borderRightWidth: 1,
  },
  tableColumnNarrow: {
    width: '100%',
    borderRightWidth: 0,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.one,
  },
  toolbar: {
    gap: Spacing.one,
  },
  toolbarButtons: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  toolbarLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1,
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
    borderRadius: Radius.medium,
    gap: Spacing.two,
  },
  colName: {
    flex: 1,
    gap: 1,
  },
  panel: {
    flex: 1,
  },
  panelContent: {
    padding: Spacing.four,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  panelEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.two,
  },
  cardSection: {
    gap: Spacing.half,
  },
  researchBlock: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  sectionSpacing: {
    marginTop: Spacing.four,
  },
  deleteButton: {
    marginTop: Spacing.six,
  },
  flexShrink: {
    flexShrink: 1,
  },
});

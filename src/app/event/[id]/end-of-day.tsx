import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  generateFollowup,
  getActionItemsForContacts,
  getContactsForEvent,
  getEvent,
  getJobsForContacts,
  setActionItemDone,
  setJobApplied,
  updateContact,
} from '@/lib/storage';
import {
  FOLLOWUP_TONES,
  type ActionItem,
  type BoothEvent,
  type Contact,
  type FollowupStatus,
  type FollowupTone,
  type JobOpportunity,
} from '@/lib/types';

const STATUS_LABELS: Record<FollowupStatus, string> = {
  not_sent: 'Not sent',
  sent: 'Sent',
  replied: 'Replied',
};

const TONE_LABELS: Record<FollowupTone, string> = {
  casual: 'Casual',
  professional: 'Professional',
  enthusiastic: 'Enthusiastic',
};

// AI-found deadlines are free text ("Oct 15", "rolling", no year) — best
// effort parse for sorting, anything unparseable sorts to the end rather
// than being dropped.
function deadlineSortKey(deadline?: string): number {
  if (!deadline) return Infinity;
  const parsed = Date.parse(deadline);
  return Number.isNaN(parsed) ? Infinity : parsed;
}

function linkedInUrlFor(contact: Contact): string {
  if (contact.linkedinUrl) return contact.linkedinUrl;
  const query = [contact.name, contact.company].filter(Boolean).join(' ');
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`;
}

function ContactFollowupCard({
  contact,
  generating,
  copiedKey,
  onCopy,
  onRegenerate,
  onStatusChange,
}: {
  contact: Contact;
  generating: boolean;
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
  onRegenerate: (contact: Contact, tone: FollowupTone) => void;
  onStatusChange: (contact: Contact, status: FollowupStatus) => void;
}) {
  const [tone, setTone] = useState<FollowupTone>(contact.followupTone);
  // Pick up the tone actually used once a generation completes (it may
  // differ from what's locally selected if a bulk "Draft All" run used the
  // contact's previously-saved tone). Adjusted during render rather than in
  // an effect — see https://react.dev/learn/you-might-not-need-an-effect.
  const [lastGeneratedAt, setLastGeneratedAt] = useState(contact.followupGeneratedAt);
  if (contact.followupGeneratedAt !== lastGeneratedAt) {
    setLastGeneratedAt(contact.followupGeneratedAt);
    setTone(contact.followupTone);
  }

  const hasDraft = !!contact.linkedinNote;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">
        {contact.name}
        {contact.company ? ` — ${contact.company}` : ''}
      </ThemedText>

      <ThemedView style={styles.chipRow}>
        {FOLLOWUP_TONES.map((t) => (
          <Pressable
            key={t}
            onPress={() => setTone(t)}
            style={[styles.chip, tone === t && styles.chipSelected]}>
            <ThemedText type="small">{TONE_LABELS[t]}</ThemedText>
          </Pressable>
        ))}
      </ThemedView>

      {hasDraft ? (
        <>
          <ThemedView style={styles.draftBlock}>
            <ThemedText type="small" themeColor="textSecondary">
              LinkedIn connection note ({contact.linkedinNote!.length}/300)
            </ThemedText>
            <ThemedText type="small">{contact.linkedinNote}</ThemedText>
            <Pressable onPress={() => onCopy(`${contact.id}:note`, contact.linkedinNote!)}>
              <ThemedText type="link" themeColor="textSecondary">
                {copiedKey === `${contact.id}:note` ? 'Copied ✓' : 'Copy'}
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView style={styles.draftBlock}>
            <ThemedText type="small" themeColor="textSecondary">
              Follow-up message
            </ThemedText>
            <ThemedText type="small">{contact.linkedinMessage}</ThemedText>
            <Pressable onPress={() => onCopy(`${contact.id}:message`, contact.linkedinMessage!)}>
              <ThemedText type="link" themeColor="textSecondary">
                {copiedKey === `${contact.id}:message` ? 'Copied ✓' : 'Copy'}
              </ThemedText>
            </Pressable>
          </ThemedView>

          {!!contact.emailDraft && (
            <ThemedView style={styles.draftBlock}>
              <ThemedText type="small" themeColor="textSecondary">
                Email draft
              </ThemedText>
              <ThemedText type="small">{contact.emailDraft}</ThemedText>
              <Pressable onPress={() => onCopy(`${contact.id}:email`, contact.emailDraft!)}>
                <ThemedText type="link" themeColor="textSecondary">
                  {copiedKey === `${contact.id}:email` ? 'Copied ✓' : 'Copy'}
                </ThemedText>
              </Pressable>
            </ThemedView>
          )}
        </>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          No draft yet.
        </ThemedText>
      )}

      <ThemedView style={styles.actionRow}>
        <Pressable
          onPress={() => onRegenerate(contact, tone)}
          disabled={generating}
          style={({ pressed }) => [styles.aiButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.aiButtonText}>
            {generating ? 'Drafting…' : hasDraft ? 'Regenerate' : 'Draft with AI'}
          </ThemedText>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(linkedInUrlFor(contact))}>
          <ThemedText type="link" themeColor="textSecondary">
            Open LinkedIn
          </ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView style={styles.chipRow}>
        {(Object.keys(STATUS_LABELS) as FollowupStatus[]).map((status) => (
          <Pressable
            key={status}
            onPress={() => onStatusChange(contact, status)}
            style={[styles.chip, contact.followupStatus === status && styles.chipSelected]}>
            <ThemedText type="small">{STATUS_LABELS[status]}</ThemedText>
          </Pressable>
        ))}
      </ThemedView>
    </ThemedView>
  );
}

export default function EndOfDayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<BoothEvent | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [jobs, setJobs] = useState<JobOpportunity[]>([]);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [draftAllProgress, setDraftAllProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [foundEvent, foundContacts] = await Promise.all([getEvent(id), getContactsForEvent(id)]);
    setEvent(foundEvent ?? null);
    setContacts(foundContacts);
    const contactIds = foundContacts.map((c) => c.id);
    const [items, jobList] = await Promise.all([
      getActionItemsForContacts(contactIds),
      getJobsForContacts(contactIds),
    ]);
    setActionItems(items);
    setJobs(jobList);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleCopy = async (key: string, text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500);
  };

  const handleRegenerate = async (contact: Contact, tone: FollowupTone) => {
    setGeneratingId(contact.id);
    try {
      const updated = await generateFollowup(contact.id, tone);
      setContacts((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
    } catch (error) {
      Alert.alert(
        "Couldn't draft a follow-up",
        error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setGeneratingId(null);
    }
  };

  const handleDraftAll = async () => {
    const targets = contacts.filter((c) => !c.linkedinNote);
    if (targets.length === 0) return;
    setDraftAllProgress({ done: 0, total: targets.length });
    // One at a time, not Promise.all — same $0-budget rule as Phase 3: the
    // free tier's rate limit means concurrent Gemini calls just fail more.
    for (let i = 0; i < targets.length; i++) {
      try {
        const updated = await generateFollowup(targets[i].id);
        setContacts((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
      } catch {
        // A single contact's draft failing shouldn't stop the rest of the batch.
      }
      setDraftAllProgress({ done: i + 1, total: targets.length });
    }
    setDraftAllProgress(null);
  };

  const handleStatusChange = async (contact: Contact, followupStatus: FollowupStatus) => {
    setContacts((prev) => prev.map((c) => (c.id === contact.id ? { ...c, followupStatus } : c)));
    await updateContact(contact.id, { followupStatus }).catch(() => {});
  };

  const toggleActionItem = (item: ActionItem) => {
    setActionItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)));
    setActionItemDone(item.id, !item.done).catch(() => {});
  };

  const toggleJobApplied = (job: JobOpportunity) => {
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, applied: !j.applied } : j)));
    setJobApplied(job.id, !job.applied).catch(() => {});
  };

  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const sortedJobs = [...jobs].sort((a, b) => deadlineSortKey(a.deadline) - deadlineSortKey(b.deadline));
  const draftsMissing = contacts.filter((c) => !c.linkedinNote).length;

  if (!event) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        Everything to act on tonight for {event.name}
      </ThemedText>

      {draftsMissing > 0 && (
        <Pressable
          onPress={handleDraftAll}
          disabled={!!draftAllProgress}
          style={({ pressed }) => [styles.aiButton, styles.draftAllButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.aiButtonText}>
            {draftAllProgress
              ? `Drafting… ${draftAllProgress.done}/${draftAllProgress.total}`
              : `✨ Draft All Follow-ups (${draftsMissing})`}
          </ThemedText>
        </Pressable>
      )}

      {contacts.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionSpacing}>
          No contacts at this event yet.
        </ThemedText>
      ) : (
        <ThemedView style={styles.sectionSpacing}>
          <ThemedText type="smallBold">Follow-ups</ThemedText>
          {contacts.map((contact) => (
            <ContactFollowupCard
              key={contact.id}
              contact={contact}
              generating={generatingId === contact.id}
              copiedKey={copiedKey}
              onCopy={handleCopy}
              onRegenerate={handleRegenerate}
              onStatusChange={handleStatusChange}
            />
          ))}
        </ThemedView>
      )}

      {sortedJobs.length > 0 && (
        <ThemedView style={styles.sectionSpacing}>
          <ThemedText type="smallBold">Jobs to apply for</ThemedText>
          {sortedJobs.map((job) => (
            <ThemedView key={job.id} type="backgroundElement" style={styles.listRow}>
              <Pressable onPress={() => toggleJobApplied(job)} style={styles.flexShrink}>
                <ThemedText type="small">
                  {job.applied ? '☑' : '☐'} {job.title}
                  {contactById.get(job.contactId)?.company
                    ? ` — ${contactById.get(job.contactId)?.company}`
                    : ''}
                  {job.deadline ? ` — due ${job.deadline}` : ''}
                </ThemedText>
              </Pressable>
              {!!job.url && (
                <Pressable onPress={() => Linking.openURL(job.url!)}>
                  <ThemedText type="link" themeColor="textSecondary">
                    Open
                  </ThemedText>
                </Pressable>
              )}
            </ThemedView>
          ))}
        </ThemedView>
      )}

      {actionItems.length > 0 && (
        <ThemedView style={styles.sectionSpacing}>
          <ThemedText type="smallBold">Action items</ThemedText>
          {actionItems.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => toggleActionItem(item)}
              style={[styles.listRow, { backgroundColor: 'transparent' }]}>
              <ThemedText type="small">
                {item.done ? '☑' : '☐'} {item.text}
                {contactById.get(item.contactId)
                  ? ` — ${contactById.get(item.contactId)!.name}`
                  : ''}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
    gap: Spacing.two,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },
  sectionSpacing: {
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  draftBlock: {
    gap: Spacing.half,
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: 'transparent',
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
  draftAllButton: {
    marginTop: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
  flexShrink: {
    flexShrink: 1,
  },
});

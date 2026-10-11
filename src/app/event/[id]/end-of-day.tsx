import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Checkbox } from '@/components/checkbox';
import { Confetti, useConfetti } from '@/components/confetti';
import { EmptyState } from '@/components/empty-state';
import { FollowupCard } from '@/components/followup-card';
import { JobSuggestionRow, JobSuggestionsDisclaimer } from '@/components/job-suggestions';
import { LoadingView } from '@/components/loading-view';
import { ProgressBar } from '@/components/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Toast, useToast } from '@/components/toast';
import { describeAiError } from '@/lib/ai-errors';
import { deadlineSortKey } from '@/lib/deadlines';
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
import type {
  ActionItem,
  BoothEvent,
  Contact,
  FollowupStatus,
  FollowupTone,
  JobOpportunity,
} from '@/lib/types';

const isFollowedUp = (contact: Contact) =>
  contact.followupStatus === 'sent' || contact.followupStatus === 'replied';

// "Fully done" for the night = every follow-up sent (or already replied)
// and every action item checked off. Job suggestions don't count — they're
// AI suggestions, and not applying to one is a valid choice.
function progressFor(contacts: Contact[], actionItems: ActionItem[]) {
  const total = contacts.length + actionItems.length;
  const done = contacts.filter(isFollowedUp).length + actionItems.filter((i) => i.done).length;
  return { total, done, allDone: total > 0 && done === total };
}

export default function EndOfDayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { burst, celebrate } = useConfetti();
  const [event, setEvent] = useState<BoothEvent | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [jobs, setJobs] = useState<JobOpportunity[]>([]);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [draftAllProgress, setDraftAllProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const { toastMessage, showToast } = useToast();

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

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    showToast('Copied!');
  };

  const handleRegenerate = async (contact: Contact, tone: FollowupTone) => {
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

  // Confetti for a follow-up marked Sent, and again (bigger moment) when
  // that action finishes off the whole night's list. Only on the user's own
  // action — never just from loading an already-finished event.
  const celebrateIfEarned = (
    nextContacts: Contact[],
    nextItems: ActionItem[],
    justSent: boolean,
  ) => {
    const wasDone = progressFor(contacts, actionItems).allDone;
    const nowDone = progressFor(nextContacts, nextItems).allDone;
    if (justSent || (!wasDone && nowDone)) celebrate();
  };

  const handleStatusChange = async (contact: Contact, followupStatus: FollowupStatus) => {
    const next = contacts.map((c) => (c.id === contact.id ? { ...c, followupStatus } : c));
    celebrateIfEarned(next, actionItems, followupStatus === 'sent' && contact.followupStatus !== 'sent');
    setContacts(next);
    await updateContact(contact.id, { followupStatus }).catch(() => {});
  };

  const toggleActionItem = (item: ActionItem) => {
    const next = actionItems.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i));
    celebrateIfEarned(contacts, next, false);
    setActionItems(next);
    setActionItemDone(item.id, !item.done).catch(() => {});
  };

  const toggleJobApplied = (job: JobOpportunity) => {
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, applied: !j.applied } : j)));
    setJobApplied(job.id, !job.applied).catch(() => {});
  };

  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const sortedJobs = [...jobs].sort((a, b) => deadlineSortKey(a.deadline) - deadlineSortKey(b.deadline));
  const draftsMissing = contacts.filter((c) => !c.linkedinNote).length;
  const progress = progressFor(contacts, actionItems);

  if (!event) return <LoadingView />;

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + Spacing.six }]}>
        <ThemedText type="body" themeColor="textMuted">
          Everything to act on tonight for {event.name}
        </ThemedText>

        {progress.total > 0 && (
          <View
            style={[
              styles.progressCard,
              { backgroundColor: progress.allDone ? theme.successMuted : theme.surface, borderColor: theme.border },
            ]}>
            <View style={styles.progressHeader}>
              <ThemedText type="bodyBold" themeColor={progress.allDone ? 'successStrong' : 'text'}>
                {progress.allDone ? '🎉 All done for tonight! Go get some sleep.' : 'Tonight’s progress'}
              </ThemedText>
              <ThemedText type="label" themeColor={progress.allDone ? 'successStrong' : 'textMuted'}>
                {progress.done}/{progress.total}
              </ThemedText>
            </View>
            <ProgressBar value={progress.done / progress.total} />
          </View>
        )}

        {draftsMissing > 0 && (
          <Button
            label={
              draftAllProgress
                ? `Drafting… ${draftAllProgress.done}/${draftAllProgress.total}`
                : `Draft All Follow-ups (${draftsMissing})`
            }
            icon="sparkles"
            onPress={handleDraftAll}
            loading={!!draftAllProgress}
            style={styles.draftAllButton}
          />
        )}

        {contacts.length === 0 ? (
          <EmptyState
            emoji="🌙"
            title="Nothing to wrap up yet"
            body="Once you've met a few people, this is where you'll send follow-ups and tick off to-dos."
            style={styles.sectionSpacing}
          />
        ) : (
          <View style={styles.sectionSpacing}>
            <ThemedText type="title">Follow-ups</ThemedText>
            {contacts.map((contact) => (
              <FollowupCard
                key={contact.id}
                contact={contact}
                generating={generatingId === contact.id}
                onCopy={handleCopy}
                onRegenerate={handleRegenerate}
                onStatusChange={handleStatusChange}
              />
            ))}
          </View>
        )}

        {sortedJobs.length > 0 && (
          <View style={styles.sectionSpacing}>
            <ThemedText type="title">Jobs to apply for</ThemedText>
            <JobSuggestionsDisclaimer />
            <Card>
              {sortedJobs.map((job) => (
                <JobSuggestionRow
                  key={job.id}
                  job={job}
                  company={contactById.get(job.contactId)?.company}
                  onToggleApplied={toggleJobApplied}
                  meta={
                    <ThemedText type="caption" themeColor="textMuted">
                      {[contactById.get(job.contactId)?.company, contactById.get(job.contactId)?.name]
                        .filter(Boolean)
                        .join(' · ')}
                    </ThemedText>
                  }
                />
              ))}
            </Card>
          </View>
        )}

        {actionItems.length > 0 && (
          <View style={styles.sectionSpacing}>
            <ThemedText type="title">Action items</ThemedText>
            <Card>
              {actionItems.map((item) => (
                <Checkbox
                  key={item.id}
                  label={
                    contactById.get(item.contactId)
                      ? `${item.text} — ${contactById.get(item.contactId)!.name}`
                      : item.text
                  }
                  checked={item.done}
                  onPress={() => toggleActionItem(item)}
                />
              ))}
            </Card>
          </View>
        )}
      </ScrollView>
      <Toast message={toastMessage} />
      <Confetti burst={burst} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  draftAllButton: {
    marginTop: Spacing.two,
  },
  progressCard: {
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.two,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});

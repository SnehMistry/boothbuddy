import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Checkbox } from '@/components/checkbox';
import { ExternalLinkRow } from '@/components/external-link-row';
import { FollowupCard } from '@/components/followup-card';
import { LoadingView } from '@/components/loading-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
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

  if (!event) return <LoadingView />;

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="body" themeColor="textMuted">
          Everything to act on tonight for {event.name}
        </ThemedText>

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
          <ThemedText type="body" themeColor="textMuted" style={styles.sectionSpacing}>
            No contacts at this event yet.
          </ThemedText>
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
            <Card>
              {sortedJobs.map((job) => (
                <View key={job.id} style={styles.listRow}>
                  <View style={styles.flexShrink}>
                    <Checkbox
                      label={job.title}
                      checked={job.applied}
                      onPress={() => toggleJobApplied(job)}
                    />
                    <View style={styles.jobMetaRow}>
                      {!!contactById.get(job.contactId)?.company && (
                        <ThemedText type="caption" themeColor="textMuted">
                          {contactById.get(job.contactId)?.company}
                        </ThemedText>
                      )}
                      {!!job.deadline && (
                        <ThemedText type="caption" themeColor="warning">
                          Due {job.deadline}
                        </ThemedText>
                      )}
                    </View>
                  </View>
                  {!!job.url && <ExternalLinkRow url={job.url} label="Open" />}
                </View>
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
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  jobMetaRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginLeft: Spacing.four,
  },
  flexShrink: {
    flexShrink: 1,
  },
});

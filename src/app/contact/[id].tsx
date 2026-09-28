import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { AiErrorNotice } from '@/components/ai-error-notice';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Checkbox } from '@/components/checkbox';
import { Chip } from '@/components/chip';
import { ExternalLinkRow } from '@/components/external-link-row';
import { InterestPicker } from '@/components/interest-picker';
import { LoadingView } from '@/components/loading-view';
import { PhotoPicker } from '@/components/photo-picker';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describeAiError } from '@/lib/ai-errors';
import { confirmAction } from '@/lib/confirm';
import {
  addPhotoToContact,
  deleteContact,
  getActionItemsForContact,
  getContact,
  getJobsForContact,
  processContact,
  removePhotoFromContact,
  setActionItemDone,
  setContactPhotoLabel,
  setJobApplied,
  setResearchMatchStatus,
  updateContact,
} from '@/lib/storage';
import type { ActionItem, Contact, ContactPhoto, InterestLevel, JobOpportunity, PhotoLabel } from '@/lib/types';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [contact, setContact] = useState<Contact | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [jobs, setJobs] = useState<JobOpportunity[]>([]);
  const [name, setName] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [researchExpanded, setResearchExpanded] = useState(true);

  const loadAll = useCallback(async (contactId: string) => {
    const [found, items, jobList] = await Promise.all([
      getContact(contactId),
      getActionItemsForContact(contactId),
      getJobsForContact(contactId),
    ]);
    if (found) {
      setContact(found);
      setName(found.name);
      setCompanyUrl(found.companyUrl ?? '');
      setNotes(found.notes ?? '');
    }
    setActionItems(items);
    setJobs(jobList);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll(id);
    }, [id, loadAll]),
  );

  // AI processing (triggered right after Save, or by the button below) runs
  // in the background — poll while it's in flight so this screen updates
  // on its own instead of requiring the user to leave and come back.
  useEffect(() => {
    if (!contact || contact.aiStatus !== 'processing' || processing) return;
    const interval = setInterval(() => loadAll(contact.id), 4000);
    return () => clearInterval(interval);
  }, [contact, processing, loadAll]);

  // Save on blur rather than on every keystroke, so we're not writing to
  // storage on every character typed.
  const saveName = async () => {
    const trimmed = name.trim();
    if (!contact || trimmed === contact.name) return;
    const updated = await updateContact(contact.id, { name: trimmed });
    if (updated) setContact(updated);
  };

  const saveCompanyUrl = async () => {
    const trimmed = companyUrl.trim();
    if (!contact || trimmed === (contact.companyUrl ?? '')) return;
    const updated = await updateContact(contact.id, { companyUrl: trimmed || undefined });
    if (updated) setContact(updated);
  };

  const saveNotes = async () => {
    const trimmed = notes.trim();
    if (!contact || trimmed === (contact.notes ?? '')) return;
    const updated = await updateContact(contact.id, { notes: trimmed || undefined });
    if (updated) setContact(updated);
  };

  const handleAddPhoto = async (photo: ContactPhoto) => {
    if (!contact) return;
    const updated = await addPhotoToContact(contact.id, photo);
    if (updated) setContact(updated);
  };

  const handleRemovePhoto = async (photo: ContactPhoto) => {
    if (!contact) return;
    const updated = await removePhotoFromContact(contact.id, photo);
    if (updated) setContact(updated);
  };

  const handleLabelChange = async (photoId: string, label: PhotoLabel | undefined) => {
    if (!contact) return;
    const updated = await setContactPhotoLabel(contact.id, photoId, label);
    if (updated) setContact(updated);
  };

  const handleProcess = async () => {
    if (!contact || processing) return;
    setProcessing(true);
    try {
      const result = await processContact(contact.id);
      setContact((prev) => (prev ? { ...prev, ...result.contact, photos: prev.photos } : prev));
      setActionItems(result.actionItems);
      setJobs(result.jobs);
    } catch (error) {
      Alert.alert(
        "Couldn't process with AI",
        describeAiError(error instanceof Error ? error.message : undefined).headline,
      );
      await loadAll(contact.id);
    } finally {
      setProcessing(false);
    }
  };

  const setInterestLevel = async (level: InterestLevel) => {
    if (!contact || contact.interestLevel === level) return;
    // Optimistic: show the new selection immediately rather than waiting
    // on the round trip, and revert with an explicit error if it fails
    // instead of leaving the tap looking like it did nothing.
    const previous = contact;
    setContact({ ...contact, interestLevel: level });
    try {
      const updated = await updateContact(contact.id, { interestLevel: level });
      if (updated) setContact(updated);
    } catch (error) {
      setContact(previous);
      Alert.alert(
        "Couldn't update interest level",
        error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      );
    }
  };

  const toggleActionItem = (item: ActionItem) => {
    setActionItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)));
    setActionItemDone(item.id, !item.done).catch(() => {});
  };

  const toggleJobApplied = (job: JobOpportunity) => {
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, applied: !j.applied } : j)));
    setJobApplied(job.id, !job.applied).catch(() => {});
  };

  const handleMatchStatus = async (matchStatus: 'confirmed' | 'rejected') => {
    if (!contact) return;
    const updated = await setResearchMatchStatus(contact, matchStatus);
    if (updated) setContact(updated);
  };

  const handleDelete = async () => {
    if (!contact) return;
    const eventId = contact.eventId;
    const confirmed = await confirmAction(
      'Delete this contact?',
      `${contact.name || 'This contact'}, their photos, and any AI research/drafts will be permanently deleted.`,
    );
    if (!confirmed) return;
    try {
      await deleteContact(contact);
      router.replace(`/event/${eventId}`);
    } catch (error) {
      Alert.alert(
        "Couldn't delete contact",
        error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      );
    }
  };

  if (!contact) return <LoadingView />;

  const hasCard = contact.aiStatus === 'done';

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.container}>
      <View style={styles.timestampRow}>
        <Ionicons name="time-outline" size={13} color={theme.textMuted} />
        <ThemedText type="caption" themeColor="textMuted">
          Captured {formatDateTime(contact.createdAt)}
        </ThemedText>
      </View>

      <View
        style={[
          styles.statusBar,
          {
            backgroundColor:
              contact.aiStatus === 'error' ? theme.dangerMuted : theme.accentMuted,
          },
        ]}>
        {contact.aiStatus === 'processing' ? (
          <View style={styles.statusRow}>
            <Ionicons name="sparkles" size={16} color={theme.accent} />
            <ThemedText type="body" themeColor="accent" style={styles.flexShrink}>
              AI is processing this contact — this can take up to a minute on the free tier…
            </ThemedText>
          </View>
        ) : contact.aiStatus === 'error' ? (
          <>
            <AiErrorNotice error={contact.aiError} />
            <Button
              label={processing ? 'Retrying…' : 'Retry'}
              onPress={handleProcess}
              disabled={processing}
              loading={processing}
              icon="refresh"
            />
          </>
        ) : (
          <Button
            label={processing ? 'AI busy, retrying…' : hasCard ? 'Reprocess with AI' : 'Process with AI'}
            onPress={handleProcess}
            disabled={processing}
            loading={processing}
            icon="sparkles"
          />
        )}
      </View>

      {hasCard && (
        <Card style={styles.aiCard}>
          {(contact.title || contact.company) && (
            <ThemedText type="heading">
              {[contact.title, contact.company].filter(Boolean).join(' at ')}
            </ThemedText>
          )}

          <InterestPicker value={contact.interestLevel} onChange={setInterestLevel} />

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
              <View style={styles.sectionLabelRow}>
                <Ionicons name="briefcase-outline" size={14} color={theme.textMuted} />
                <ThemedText type="label" themeColor="textMuted">
                  Roles / opportunities mentioned
                </ThemedText>
              </View>
              {contact.rolesMentioned.map((role, i) => (
                <ThemedText key={i} type="body">
                  • {role}
                </ThemedText>
              ))}
            </View>
          )}

          {!!contact.deadlines?.length && (
            <View style={styles.cardSection}>
              <View style={styles.sectionLabelRow}>
                <Ionicons name="time-outline" size={14} color={theme.textMuted} />
                <ThemedText type="label" themeColor="textMuted">
                  Deadlines mentioned
                </ThemedText>
              </View>
              <View style={styles.chipRow}>
                {contact.deadlines.map((deadline, i) => (
                  <Badge key={i} label={deadline} tone="warning" />
                ))}
              </View>
            </View>
          )}

          {!!contact.memorable && (
            <View style={styles.cardSection}>
              <View style={styles.sectionLabelRow}>
                <Ionicons name="heart-outline" size={14} color={theme.textMuted} />
                <ThemedText type="label" themeColor="textMuted">
                  Memorable
                </ThemedText>
              </View>
              <ThemedText type="body">{contact.memorable}</ThemedText>
            </View>
          )}

          {!!contact.email && <ExternalLinkRow url={`mailto:${contact.email}`} label={contact.email} />}
          {!!contact.linkedinUrl && <ExternalLinkRow url={contact.linkedinUrl} />}
        </Card>
      )}

      {!!actionItems.length && (
        <View style={styles.sectionSpacing}>
          <ThemedText type="title">Action items</ThemedText>
          <Card>
            {actionItems.map((item) => (
              <Checkbox key={item.id} label={item.text} checked={item.done} onPress={() => toggleActionItem(item)} />
            ))}
          </Card>
        </View>
      )}

      {!!jobs.length && (
        <View style={styles.sectionSpacing}>
          <ThemedText type="title">Jobs found</ThemedText>
          <Card>
            {jobs.map((job) => (
              <View key={job.id} style={styles.jobRow}>
                <View style={styles.flexShrink}>
                  <Checkbox label={job.title} checked={job.applied} onPress={() => toggleJobApplied(job)} />
                  {!!job.deadline && (
                    <View style={styles.jobDeadline}>
                      <Badge label={`Due ${job.deadline}`} tone="warning" />
                    </View>
                  )}
                </View>
                {!!job.url && <ExternalLinkRow url={job.url} label="Open" />}
              </View>
            ))}
          </Card>
        </View>
      )}

      {!!contact.research && (
        <Card style={styles.researchCard}>
          <Pressable
            onPress={() => setResearchExpanded((v) => !v)}
            style={styles.researchHeader}>
            <ThemedText type="heading">Research</ThemedText>
            <View style={styles.researchHeaderRight}>
              <Badge
                label={contact.research.grounded ? 'Live-searched' : "AI's knowledge only"}
                tone={contact.research.grounded ? 'success' : 'neutral'}
              />
              <Ionicons
                name={researchExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={theme.textMuted}
              />
            </View>
          </Pressable>

          {researchExpanded && (
            <>
              {!!contact.research.person.summary && (
                <View style={styles.cardSection}>
                  <View style={styles.sectionLabelRow}>
                    <ThemedText type="label" themeColor="textMuted">
                      About {contact.name}
                    </ThemedText>
                    <Badge
                      label={contact.research.person.confidence === 'high' ? 'High confidence' : 'Low confidence'}
                      tone={contact.research.person.confidence === 'high' ? 'success' : 'warning'}
                    />
                  </View>
                  <ThemedText type="body">{contact.research.person.summary}</ThemedText>
                </View>
              )}

              {!!contact.research.company.summary && (
                <View style={styles.cardSection}>
                  <ThemedText type="label" themeColor="textMuted">
                    About the company
                  </ThemedText>
                  <ThemedText type="body">{contact.research.company.summary}</ThemedText>
                </View>
              )}

              {!!contact.research.sources.length && (
                <View style={styles.cardSection}>
                  <ThemedText type="label" themeColor="textMuted">
                    Sources
                  </ThemedText>
                  {contact.research.sources.map((source) => (
                    <ExternalLinkRow key={source.url} url={source.url} label={source.title || undefined} />
                  ))}
                </View>
              )}

              {contact.research.matchStatus === 'unconfirmed' ? (
                <View style={styles.chipRow}>
                  <Button label="This is them" icon="checkmark" onPress={() => handleMatchStatus('confirmed')} />
                  <Button label="Wrong person" variant="secondary" onPress={() => handleMatchStatus('rejected')} />
                </View>
              ) : (
                <Badge
                  label={contact.research.matchStatus === 'confirmed' ? 'Match confirmed' : 'Match rejected'}
                  tone={contact.research.matchStatus === 'confirmed' ? 'success' : 'neutral'}
                />
              )}
            </>
          )}
        </Card>
      )}

      <ThemedText type="label" themeColor="textMuted" style={styles.sectionSpacing}>
        Name
      </ThemedText>
      <TextInput
        value={name}
        onChangeText={setName}
        onBlur={saveName}
        placeholder="Their name"
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
      />

      <ThemedText type="label" themeColor="textMuted" style={styles.sectionSpacing}>
        Photos
      </ThemedText>
      <PhotoPicker
        photos={contact.photos}
        onAdd={handleAddPhoto}
        onRemove={handleRemovePhoto}
        onLabelChange={handleLabelChange}
      />

      <ThemedText type="label" themeColor="textMuted" style={styles.sectionSpacing}>
        Notes
      </ThemedText>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        onBlur={saveNotes}
        placeholder="Type quick notes about this person or conversation…"
        placeholderTextColor={theme.textMuted}
        multiline
        style={[
          styles.notesInput,
          { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      />

      <ThemedText type="label" themeColor="textMuted" style={styles.sectionSpacing}>
        Company URL
      </ThemedText>
      <TextInput
        value={companyUrl}
        onChangeText={setCompanyUrl}
        onBlur={saveCompanyUrl}
        placeholder="https://company.com"
        placeholderTextColor={theme.textMuted}
        autoCapitalize="none"
        keyboardType="url"
        style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
      />
      {!!contact.companyUrl && (
        <View style={styles.companyLinkRow}>
          <ExternalLinkRow url={contact.companyUrl} />
        </View>
      )}

      <Button
        label="Delete Contact"
        variant="danger"
        icon="trash-outline"
        onPress={handleDelete}
        style={styles.deleteButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
    gap: Spacing.one,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionSpacing: {
    marginTop: Spacing.four,
  },
  input: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  notesInput: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  statusBar: {
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    gap: Spacing.two,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  companyLinkRow: {
    marginTop: Spacing.one,
  },
  deleteButton: {
    marginTop: Spacing.six,
    alignSelf: 'flex-start',
  },
  aiCard: {
    marginTop: Spacing.three,
  },
  cardSection: {
    gap: Spacing.half,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.one,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  jobRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  jobDeadline: {
    marginLeft: Spacing.four,
    marginTop: 2,
  },
  flexShrink: {
    flexShrink: 1,
  },
  researchCard: {
    marginTop: Spacing.three,
  },
  researchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  researchHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});

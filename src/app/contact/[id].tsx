import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

import { PhotoPicker } from '@/components/photo-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  addPhotoToContact,
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
import {
  INTEREST_LEVELS,
  type ActionItem,
  type Contact,
  type ContactPhoto,
  type InterestLevel,
  type JobOpportunity,
  type PhotoLabel,
} from '@/lib/types';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const INTEREST_LABELS: Record<InterestLevel, string> = {
  hot: '🔥 Hot',
  warm: '🌤️ Warm',
  cold: '❄️ Cold',
};

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
        error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      );
      await loadAll(contact.id);
    } finally {
      setProcessing(false);
    }
  };

  const setInterestLevel = async (level: InterestLevel) => {
    if (!contact || contact.interestLevel === level) return;
    const updated = await updateContact(contact.id, { interestLevel: level });
    if (updated) setContact(updated);
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

  if (!contact) return null;

  const hasCard = contact.aiStatus === 'done';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        Captured {formatDateTime(contact.createdAt)}
      </ThemedText>

      <ThemedView type="backgroundElement" style={styles.aiStatusBar}>
        {contact.aiStatus === 'processing' ? (
          <ThemedText type="small" themeColor="textSecondary">
            ✨ AI is processing this contact — this can take up to a minute on the free tier…
          </ThemedText>
        ) : contact.aiStatus === 'error' ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              ⚠️ AI processing failed: {contact.aiError ?? 'Unknown error'}
            </ThemedText>
            <Pressable
              onPress={handleProcess}
              disabled={processing}
              style={({ pressed }) => [styles.aiButton, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={styles.aiButtonText}>
                {processing ? 'Retrying…' : 'Retry'}
              </ThemedText>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={handleProcess}
            disabled={processing}
            style={({ pressed }) => [styles.aiButton, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={styles.aiButtonText}>
              {processing
                ? 'AI busy, retrying…'
                : hasCard
                  ? '✨ Reprocess with AI'
                  : '✨ Process with AI'}
            </ThemedText>
          </Pressable>
        )}
      </ThemedView>

      {hasCard && (
        <ThemedView type="backgroundElement" style={styles.card}>
          {(contact.title || contact.company) && (
            <ThemedText type="smallBold">
              {[contact.title, contact.company].filter(Boolean).join(' at ')}
            </ThemedText>
          )}

          <ThemedView style={styles.chipRow}>
            {INTEREST_LEVELS.map((level) => (
              <Pressable
                key={level}
                onPress={() => setInterestLevel(level)}
                style={[styles.chip, contact.interestLevel === level && styles.chipSelected]}>
                <ThemedText type="small">{INTEREST_LABELS[level]}</ThemedText>
              </Pressable>
            ))}
          </ThemedView>

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
            <ThemedView style={styles.cardSection}>
              <ThemedText type="small" themeColor="textSecondary">
                Roles / opportunities mentioned
              </ThemedText>
              {contact.rolesMentioned.map((role, i) => (
                <ThemedText key={i} type="small">
                  • {role}
                </ThemedText>
              ))}
            </ThemedView>
          )}

          {!!contact.deadlines?.length && (
            <ThemedView style={styles.cardSection}>
              <ThemedText type="small" themeColor="textSecondary">
                Deadlines mentioned
              </ThemedText>
              {contact.deadlines.map((deadline, i) => (
                <ThemedText key={i} type="small">
                  • {deadline}
                </ThemedText>
              ))}
            </ThemedView>
          )}

          {!!contact.memorable && (
            <ThemedView style={styles.cardSection}>
              <ThemedText type="small" themeColor="textSecondary">
                Memorable
              </ThemedText>
              <ThemedText type="small">{contact.memorable}</ThemedText>
            </ThemedView>
          )}

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
        </ThemedView>
      )}

      {!!actionItems.length && (
        <ThemedView style={styles.cardSection}>
          <ThemedText type="small" themeColor="textSecondary">
            Action items
          </ThemedText>
          {actionItems.map((item) => (
            <Pressable key={item.id} onPress={() => toggleActionItem(item)}>
              <ThemedText type="small">
                {item.done ? '☑' : '☐'} {item.text}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      )}

      {!!jobs.length && (
        <ThemedView style={styles.cardSection}>
          <ThemedText type="small" themeColor="textSecondary">
            Jobs found
          </ThemedText>
          {jobs.map((job) => (
            <ThemedView key={job.id} style={styles.jobRow}>
              <Pressable onPress={() => toggleJobApplied(job)} style={styles.flexShrink}>
                <ThemedText type="small">
                  {job.applied ? '☑' : '☐'} {job.title}
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

      {!!contact.research && (
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">
            Research —{' '}
            {contact.research.grounded
              ? 'live-searched'
              : "not live-searched, AI's own knowledge only"}
          </ThemedText>

          {!!contact.research.person.summary && (
            <ThemedView style={styles.cardSection}>
              <ThemedText type="small" themeColor="textSecondary">
                About {contact.name} —{' '}
                {contact.research.person.confidence === 'high'
                  ? 'high confidence match'
                  : 'low confidence, could be the wrong person'}
              </ThemedText>
              <ThemedText type="small">{contact.research.person.summary}</ThemedText>
            </ThemedView>
          )}

          {!!contact.research.company.summary && (
            <ThemedView style={styles.cardSection}>
              <ThemedText type="small" themeColor="textSecondary">
                About the company
              </ThemedText>
              <ThemedText type="small">{contact.research.company.summary}</ThemedText>
            </ThemedView>
          )}

          {!!contact.research.sources.length && (
            <ThemedView style={styles.cardSection}>
              <ThemedText type="small" themeColor="textSecondary">
                Sources
              </ThemedText>
              {contact.research.sources.map((source) => (
                <Pressable key={source.url} onPress={() => Linking.openURL(source.url)}>
                  <ThemedText type="link" themeColor="textSecondary">
                    {source.title || source.url}
                  </ThemedText>
                </Pressable>
              ))}
            </ThemedView>
          )}

          {contact.research.matchStatus === 'unconfirmed' ? (
            <ThemedView style={styles.chipRow}>
              <Pressable
                onPress={() => handleMatchStatus('confirmed')}
                style={({ pressed }) => [styles.aiButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={styles.aiButtonText}>
                  ✓ This is them
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => handleMatchStatus('rejected')}
                style={({ pressed }) => [styles.rejectButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold">✗ Wrong person</ThemedText>
              </Pressable>
            </ThemedView>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              {contact.research.matchStatus === 'confirmed'
                ? '✓ Match confirmed'
                : '✗ Match rejected'}
            </ThemedText>
          )}
        </ThemedView>
      )}

      <ThemedText type="small" themeColor="textSecondary" style={styles.sectionSpacing}>
        Name
      </ThemedText>
      <TextInput
        value={name}
        onChangeText={setName}
        onBlur={saveName}
        placeholder="Their name"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />

      <ThemedText type="small" themeColor="textSecondary" style={styles.sectionSpacing}>
        Photos
      </ThemedText>
      <PhotoPicker
        photos={contact.photos}
        onAdd={handleAddPhoto}
        onRemove={handleRemovePhoto}
        onLabelChange={handleLabelChange}
      />

      <ThemedText type="small" themeColor="textSecondary" style={styles.sectionSpacing}>
        Notes
      </ThemedText>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        onBlur={saveNotes}
        placeholder="Type quick notes about this person or conversation…"
        placeholderTextColor={theme.textSecondary}
        multiline
        style={[
          styles.notesInput,
          { color: theme.text, backgroundColor: theme.backgroundElement },
        ]}
      />

      <ThemedText type="small" themeColor="textSecondary" style={styles.sectionSpacing}>
        Company URL
      </ThemedText>
      <TextInput
        value={companyUrl}
        onChangeText={setCompanyUrl}
        onBlur={saveCompanyUrl}
        placeholder="https://company.com"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        keyboardType="url"
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />
      {!!contact.companyUrl && (
        <Pressable onPress={() => Linking.openURL(contact.companyUrl!)}>
          <ThemedText type="linkPrimary">Open {contact.companyUrl}</ThemedText>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
    gap: Spacing.one,
  },
  sectionSpacing: {
    marginTop: Spacing.four,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  notesInput: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  aiStatusBar: {
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
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
  card: {
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  cardSection: {
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
  tagChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.five,
  },
  jobRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flexShrink: {
    flexShrink: 1,
  },
});

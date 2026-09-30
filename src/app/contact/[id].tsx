import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { AiErrorNotice } from '@/components/ai-error-notice';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Checkbox } from '@/components/checkbox';
import { Chip } from '@/components/chip';
import { CompanyInfo, hasCompanyIdentity } from '@/components/company-info';
import { Divider } from '@/components/divider';
import { ExternalLinkRow } from '@/components/external-link-row';
import { InterestPicker } from '@/components/interest-picker';
import { JobSuggestionRow, JobSuggestionsDisclaimer } from '@/components/job-suggestions';
import { LoadingView } from '@/components/loading-view';
import { MoreMenu } from '@/components/more-menu';
import { PhotoPicker } from '@/components/photo-picker';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describeAiError } from '@/lib/ai-errors';
import { confirmAction } from '@/lib/confirm';
import { formatDateTime, formatHumanDate } from '@/lib/dates';
import {
  addPhotoToContact,
  confirmCompany,
  deleteContact,
  getActionItemsForContact,
  getContact,
  getJobsForContact,
  getProfile,
  processContact,
  refreshWithProfile,
  removePhotoFromContact,
  setActionItemDone,
  setContactPhotoLabel,
  setJobApplied,
  setResearchMatchStatus,
  updateContact,
} from '@/lib/storage';
import { stripTrackingParams } from '@/lib/url';
import type {
  ActionItem,
  CompanyCandidate,
  Contact,
  ContactPhoto,
  InterestLevel,
  JobOpportunity,
  PhotoLabel,
} from '@/lib/types';

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [contact, setContact] = useState<Contact | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [jobs, setJobs] = useState<JobOpportunity[]>([]);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [profileUpdatedAt, setProfileUpdatedAt] = useState<string | undefined>();
  const [companyUrl, setCompanyUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [researchExpanded, setResearchExpanded] = useState(true);

  const loadAll = useCallback(async (contactId: string) => {
    const [found, items, jobList, profile] = await Promise.all([
      getContact(contactId),
      getActionItemsForContact(contactId),
      getJobsForContact(contactId),
      getProfile().catch(() => undefined),
    ]);
    setProfileUpdatedAt(profile?.updatedAt);
    if (found) {
      setContact(found);
      setName(found.name);
      setCompany(found.company ?? '');
      setCompanyUrl(found.companyUrl ?? '');
      setLinkedinUrl(found.linkedinUrl ?? '');
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

  // Typing a company name by hand is the "none of these" correction for an
  // ambiguous AI pick — it's recorded as user-confirmed so the next AI
  // refresh uses exactly this name instead of guessing again.
  const saveCompany = async () => {
    const trimmed = company.trim();
    if (!contact || trimmed === (contact.company ?? '')) return;
    try {
      const updated =
        trimmed && contact.research
          ? await confirmCompany(contact, { name: trimmed })
          : await updateContact(contact.id, { company: trimmed || undefined });
      if (updated) setContact(updated);
    } catch (error) {
      setCompany(contact.company ?? '');
      Alert.alert(
        "Couldn't save company",
        error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      );
    }
  };

  const saveCompanyUrl = async () => {
    const cleaned = stripTrackingParams(companyUrl.trim());
    setCompanyUrl(cleaned);
    if (!contact || cleaned === (contact.companyUrl ?? '')) return;
    const updated = await updateContact(contact.id, { companyUrl: cleaned || undefined });
    if (updated) setContact(updated);
  };

  const saveLinkedinUrl = async () => {
    const trimmed = linkedinUrl.trim();
    if (!contact || trimmed === (contact.linkedinUrl ?? '')) return;
    const updated = await updateContact(contact.id, { linkedinUrl: trimmed || undefined });
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

  // First run: "Process with AI". Afterwards the same button is "Refresh
  // with my profile", which also redrafts existing follow-ups.
  const handleProcess = async (target: Contact | null = contact) => {
    if (!target || processing) return;
    setProcessing(true);
    try {
      const result =
        target.aiStatus === 'done' ? await refreshWithProfile(target) : await processContact(target.id);
      setContact((prev) => (prev ? { ...prev, ...result.contact, photos: prev.photos } : prev));
      setActionItems(result.actionItems);
      setJobs(result.jobs);
    } catch (error) {
      Alert.alert(
        "Couldn't process with AI",
        describeAiError(error instanceof Error ? error.message : undefined).headline,
      );
      await loadAll(target.id);
    } finally {
      setProcessing(false);
    }
  };

  // Picking the AI's own suggestion just confirms it; picking a different
  // company invalidates the research/jobs, so it refreshes right away (an
  // explicit user action, so this isn't a silent paid re-run).
  const handlePickCompany = async (choice: CompanyCandidate) => {
    if (!contact) return;
    const isSwitch = choice.name !== contact.research?.company.name;
    try {
      const updated = await confirmCompany(contact, choice);
      if (!updated) return;
      setContact(updated);
      setCompany(updated.company ?? '');
      setCompanyUrl(updated.companyUrl ?? '');
      if (isSwitch) await handleProcess(updated);
    } catch (error) {
      Alert.alert(
        "Couldn't update company",
        error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      );
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
  const profileChanged =
    hasCard && !!profileUpdatedAt && !!contact.aiProcessedAt && profileUpdatedAt > contact.aiProcessedAt;
  const companyIdentity = contact.research?.company;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + Spacing.six }]}>
      <Stack.Screen
        options={{
          title: contact.name
            ? contact.company
              ? `${contact.name} · ${contact.company}`
              : contact.name
            : 'Contact',
          headerRight: () => (
            <MoreMenu
              accessibilityLabel="Contact actions"
              items={[{ label: 'Delete contact', icon: 'trash-outline', destructive: true, onPress: handleDelete }]}
            />
          ),
        }}
      />
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
            <ThemedText type="body" themeColor="accentStrong" style={styles.flexShrink}>
              AI is processing this contact — this can take up to a minute on the free tier…
            </ThemedText>
          </View>
        ) : contact.aiStatus === 'error' ? (
          <>
            <AiErrorNotice error={contact.aiError} />
            <Button
              label={processing ? 'Retrying…' : 'Retry'}
              onPress={() => handleProcess()}
              disabled={processing}
              loading={processing}
              icon="refresh"
            />
          </>
        ) : (
          <>
            <Button
              label={processing ? 'AI busy, retrying…' : hasCard ? 'Refresh with my profile' : 'Process with AI'}
              onPress={() => handleProcess()}
              disabled={processing}
              loading={processing}
              icon={hasCard ? 'refresh' : 'sparkles'}
            />
            {profileChanged && (
              <ThemedText type="caption" themeColor="accentStrong">
                Your profile changed since this contact was processed — refresh to update its research, jobs,
                and drafts.
              </ThemedText>
            )}
          </>
        )}
      </View>

      {(hasCard || !!actionItems.length || !!jobs.length || !!contact.research) && (
        <Card style={styles.aiCard}>
          {hasCard && (
            <View style={styles.cardSection}>
              {(contact.title || contact.company) && (
                <ThemedText type="heading">
                  {[contact.title, contact.company].filter(Boolean).join(' at ')}
                </ThemedText>
              )}

              <InterestPicker value={contact.interestLevel} onChange={setInterestLevel} />

              {hasCompanyIdentity(companyIdentity) && (
                <CompanyInfo
                  company={companyIdentity}
                  onPick={handlePickCompany}
                  correctHint="None of these? Type the right name in the Company field below — it'll be used next time you refresh."
                />
              )}

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
                  <View style={styles.labelRow}>
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
                  <View style={styles.labelRow}>
                    <Ionicons name="time-outline" size={14} color={theme.textMuted} />
                    <ThemedText type="label" themeColor="textMuted">
                      Deadlines mentioned
                    </ThemedText>
                  </View>
                  <View style={styles.chipRow}>
                    {contact.deadlines.map((deadline, i) => (
                      <Badge key={i} label={formatHumanDate(deadline)} tone="warning" />
                    ))}
                  </View>
                </View>
              )}

              {!!contact.memorable && (
                <View style={styles.cardSection}>
                  <View style={styles.labelRow}>
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
            </View>
          )}

          {!!actionItems.length && (
            <>
              {hasCard && <Divider style={styles.divider} />}
              <View style={styles.cardSection}>
                <View style={styles.labelRow}>
                  <Ionicons name="checkbox-outline" size={14} color={theme.textMuted} />
                  <ThemedText type="label" themeColor="textMuted">
                    Action items
                  </ThemedText>
                </View>
                {actionItems.map((item) => (
                  <Checkbox
                    key={item.id}
                    label={item.text}
                    checked={item.done}
                    onPress={() => toggleActionItem(item)}
                  />
                ))}
              </View>
            </>
          )}

          {!!jobs.length && (
            <>
              {(hasCard || !!actionItems.length) && <Divider style={styles.divider} />}
              <View style={styles.cardSection}>
                <View style={styles.labelRow}>
                  <Ionicons name="briefcase-outline" size={14} color={theme.textMuted} />
                  <ThemedText type="label" themeColor="textMuted">
                    Suggested roles for you
                  </ThemedText>
                </View>
                <JobSuggestionsDisclaimer />
                {jobs.map((job) => (
                  <JobSuggestionRow
                    key={job.id}
                    job={job}
                    company={contact.company}
                    onToggleApplied={toggleJobApplied}
                  />
                ))}
              </View>
            </>
          )}

          {!!contact.research && (
            <>
              {(hasCard || !!actionItems.length || !!jobs.length) && <Divider style={styles.divider} />}
              <View style={styles.cardSection}>
                <Pressable onPress={() => setResearchExpanded((v) => !v)} style={styles.researchHeader}>
                  <View style={styles.labelRow}>
                    <Ionicons name="search-outline" size={14} color={theme.textMuted} />
                    <ThemedText type="label" themeColor="textMuted">
                      Research
                    </ThemedText>
                  </View>
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
                        <View style={styles.labelRowBetween}>
                          <ThemedText type="label" themeColor="textMuted">
                            About {contact.name}
                          </ThemedText>
                          <Badge
                            label={
                              contact.research.person.confidence === 'high' ? 'High confidence' : 'Low confidence'
                            }
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
                        <Button
                          label="This is them"
                          icon="checkmark"
                          onPress={() => handleMatchStatus('confirmed')}
                        />
                        <Button
                          label="Wrong person"
                          variant="secondary"
                          onPress={() => handleMatchStatus('rejected')}
                        />
                      </View>
                    ) : (
                      <Badge
                        label={contact.research.matchStatus === 'confirmed' ? 'Match confirmed' : 'Match rejected'}
                        tone={contact.research.matchStatus === 'confirmed' ? 'success' : 'neutral'}
                      />
                    )}
                  </>
                )}
              </View>
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
        Company
      </ThemedText>
      <TextInput
        value={company}
        onChangeText={setCompany}
        onBlur={saveCompany}
        placeholder="Their company"
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
          <ExternalLinkRow url={contact.companyUrl} variant="chip" />
        </View>
      )}

      <ThemedText type="label" themeColor="textMuted" style={styles.sectionSpacing}>
        LinkedIn URL
      </ThemedText>
      <ThemedText type="caption" themeColor="textMuted" style={styles.hint}>
        &ldquo;Open LinkedIn&rdquo; uses this if set, otherwise it searches by name and company.
      </ThemedText>
      <TextInput
        value={linkedinUrl}
        onChangeText={setLinkedinUrl}
        onBlur={saveLinkedinUrl}
        placeholder="https://linkedin.com/in/..."
        placeholderTextColor={theme.textMuted}
        autoCapitalize="none"
        keyboardType="url"
        style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
      />
      {!!contact.linkedinUrl && (
        <View style={styles.companyLinkRow}>
          <ExternalLinkRow url={contact.linkedinUrl} variant="chip" />
        </View>
      )}
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
  hint: {
    marginTop: -2,
    marginBottom: 2,
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
  aiCard: {
    marginTop: Spacing.three,
  },
  cardSection: {
    gap: Spacing.half,
  },
  divider: {
    marginVertical: Spacing.three,
  },
  // Icon + label only — left-aligned, not spread apart.
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  // Label on the left, a badge/status on the right — the two groups are
  // meant to sit at opposite ends.
  labelRowBetween: {
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
  flexShrink: {
    flexShrink: 1,
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

import { useState } from 'react';
import { Linking, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { FOLLOWUP_TONES, type Contact, type FollowupStatus, type FollowupTone } from '@/lib/types';

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

export function linkedInUrlFor(contact: Contact): string {
  if (contact.linkedinUrl) return contact.linkedinUrl;
  const query = [contact.name, contact.company].filter(Boolean).join(' ');
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`;
}

// Per-contact follow-up drafting UI (Phase 4): tone picker, the three
// drafts with Copy, Regenerate, Open LinkedIn, and a sent-status control.
// Shared between the mobile End-of-Day screen and the web dashboard's
// contact/draft side panel.
export function FollowupCard({
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

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
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
  pressed: {
    opacity: 0.7,
  },
});

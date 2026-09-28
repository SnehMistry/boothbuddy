import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { openExternalLink } from '@/lib/links';
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

// Gmail's compose URL pre-fills recipient/subject/body without needing any
// API or OAuth — free, and works as long as the user is signed into Gmail
// in that browser. Falls back to mailto: (opens whatever mail app/client
// the OS has configured) if the popup was blocked or Gmail's page can't
// load, so the button still does something either way.
function gmailComposeUrl(contact: Contact): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: contact.email ?? '',
    su: contact.emailSubject ?? '',
    body: contact.emailDraft ?? '',
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

function mailtoUrl(contact: Contact): string {
  const params = new URLSearchParams({
    subject: contact.emailSubject ?? '',
    body: contact.emailDraft ?? '',
  });
  return `mailto:${contact.email ?? ''}?${params.toString()}`;
}

function openInGmail(contact: Contact) {
  const opened = window.open(gmailComposeUrl(contact), '_blank', 'noopener,noreferrer');
  if (!opened) window.location.href = mailtoUrl(contact);
}

const STATUS_TONE: Record<FollowupStatus, 'neutral' | 'success'> = {
  not_sent: 'neutral',
  sent: 'success',
  replied: 'success',
};

function DraftField({
  label,
  text,
  limit,
  onCopy,
}: {
  label: string;
  text: string;
  limit?: number;
  onCopy: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <ThemedText type="label" themeColor="textMuted">
          {label}
          {limit ? ` · ${text.length}/${limit}` : ''}
        </ThemedText>
        <Pressable onPress={onCopy} style={styles.copyButton} hitSlop={6}>
          <Ionicons name="copy-outline" size={14} color={theme.accent} />
          <ThemedText type="link" themeColor="accentStrong">
            Copy
          </ThemedText>
        </Pressable>
      </View>
      <View style={[styles.textArea, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
        <ThemedText type="body">{text}</ThemedText>
      </View>
    </View>
  );
}

// Per-contact follow-up drafting UI (Phase 4): tone picker, the three
// drafts as read-only "text areas" with Copy, Regenerate, Open LinkedIn /
// Open in Gmail, and a sent-status control. Shared between the mobile
// End-of-Day screen and the web dashboard's contact/draft side panel.
export function FollowupCard({
  contact,
  generating,
  onCopy,
  onRegenerate,
  onStatusChange,
}: {
  contact: Contact;
  generating: boolean;
  onCopy: (text: string) => void;
  onRegenerate: (contact: Contact, tone: FollowupTone) => void;
  onStatusChange: (contact: Contact, status: FollowupStatus) => void;
}) {
  const theme = useTheme();
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
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.headerRow}>
        <ThemedText type="heading">
          {contact.name}
          {contact.company ? ` · ${contact.company}` : ''}
        </ThemedText>
        <Badge label={STATUS_LABELS[contact.followupStatus]} tone={STATUS_TONE[contact.followupStatus]} />
      </View>

      <View style={styles.chipRow}>
        {FOLLOWUP_TONES.map((t) => (
          <Chip key={t} label={TONE_LABELS[t]} selected={tone === t} onPress={() => setTone(t)} />
        ))}
      </View>

      {hasDraft ? (
        <>
          <DraftField
            label="LinkedIn connection note"
            text={contact.linkedinNote!}
            limit={300}
            onCopy={() => onCopy(contact.linkedinNote!)}
          />
          <DraftField
            label="Follow-up message"
            text={contact.linkedinMessage!}
            onCopy={() => onCopy(contact.linkedinMessage!)}
          />
          {!!contact.emailDraft && (
            <DraftField
              label={contact.emailSubject ? `Email · ${contact.emailSubject}` : 'Email draft'}
              text={contact.emailDraft}
              onCopy={() =>
                onCopy(
                  contact.emailSubject
                    ? `Subject: ${contact.emailSubject}\n\n${contact.emailDraft}`
                    : contact.emailDraft!,
                )
              }
            />
          )}
        </>
      ) : (
        <ThemedText type="body" themeColor="textMuted">
          No draft yet.
        </ThemedText>
      )}

      <View style={styles.actionRow}>
        <Button
          label={generating ? 'Drafting…' : hasDraft ? 'Regenerate' : 'Draft with AI'}
          icon="sparkles"
          variant="primary"
          loading={generating}
          onPress={() => onRegenerate(contact, tone)}
        />
        <Pressable onPress={() => openExternalLink(linkedInUrlFor(contact))} style={styles.linkAction}>
          <Ionicons name="logo-linkedin" size={16} color={theme.accent} />
          <ThemedText type="link" themeColor="accentStrong">
            Open LinkedIn
          </ThemedText>
        </Pressable>
        {Platform.OS === 'web' && !!contact.email && !!contact.emailDraft && (
          <Pressable onPress={() => openInGmail(contact)} style={styles.linkAction}>
            <Ionicons name="mail-outline" size={16} color={theme.accent} />
            <ThemedText type="link" themeColor="accentStrong">
              Open in Gmail
            </ThemedText>
          </Pressable>
        )}
      </View>

      <View style={styles.chipRow}>
        {(Object.keys(STATUS_LABELS) as FollowupStatus[]).map((status) => (
          <Chip
            key={status}
            label={STATUS_LABELS[status]}
            selected={contact.followupStatus === status}
            onPress={() => {
              if (status === 'sent') haptics.success();
              onStatusChange(contact, status);
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  field: {
    gap: Spacing.one,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  textArea: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    padding: Spacing.two + 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.four,
  },
  linkAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

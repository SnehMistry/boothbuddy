import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Checkbox } from '@/components/checkbox';
import { ExternalLinkRow } from '@/components/external-link-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatHumanDate } from '@/lib/dates';
import { careersSearchUrl, linkedinJobsSearchUrl } from '@/lib/job-links';
import { JOB_KIND_LABELS, type JobOpportunity } from '@/lib/types';

// The one caveat every job list carries: these are AI suggestions from the
// model's own knowledge, not live listings.
export function JobSuggestionsDisclaimer() {
  const theme = useTheme();
  return (
    <View style={styles.disclaimer}>
      <Ionicons name="information-circle-outline" size={14} color={theme.textMuted} />
      <ThemedText type="caption" themeColor="textMuted" style={styles.flexShrink}>
        AI suggestion — verify on the careers page. These aren&apos;t live job listings.
      </ThemedText>
    </View>
  );
}

// One suggested role: Applied checkbox, kind + deadline badges, "why it
// fits you", and three links — the company's real careers page (checked
// reachable server-side), a site search of that careers page for this
// title, and a LinkedIn Jobs search. Shared by the contact screen, the web
// dashboard panel, and End of Day, so the "never an invented posting
// link" rule is enforced in one place.
export function JobSuggestionRow({
  job,
  company,
  onToggleApplied,
  meta,
}: {
  job: JobOpportunity;
  company?: string;
  onToggleApplied: (job: JobOpportunity) => void;
  meta?: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Checkbox label={job.title} checked={job.applied} onPress={() => onToggleApplied(job)} />
      <View style={styles.indented}>
        {(!!job.kind || !!job.deadline) && (
          <View style={styles.badgeRow}>
            {!!job.kind && <Badge label={JOB_KIND_LABELS[job.kind]} tone="accent" />}
            {!!job.deadline && <Badge label={`Due ${formatHumanDate(job.deadline)}`} tone="warning" />}
          </View>
        )}
        {meta}
        {!!job.fitReason && (
          <ThemedText type="body" themeColor="textMuted">
            {job.fitReason}
          </ThemedText>
        )}
        <View style={styles.linkRow}>
          {!!job.url && <ExternalLinkRow url={job.url} label="Careers page" />}
          <ExternalLinkRow url={careersSearchUrl(job.title, company, job.url)} label="Search careers" />
          <ExternalLinkRow url={linkedinJobsSearchUrl(job.title, company)} label="LinkedIn Jobs" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  row: {
    gap: Spacing.half,
    paddingVertical: Spacing.one,
  },
  indented: {
    marginLeft: Spacing.four,
    gap: Spacing.one,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.three,
    rowGap: Spacing.one,
  },
  flexShrink: {
    flexShrink: 1,
  },
});

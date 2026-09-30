import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, type BadgeTone } from '@/components/badge';
import { Button } from '@/components/button';
import { ExternalLinkRow } from '@/components/external-link-row';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CompanyCandidate, CompanyIdentity, SponsorshipLikelihood } from '@/lib/types';

const SPONSORSHIP_LABEL: Record<SponsorshipLikelihood, { label: string; tone: BadgeTone }> = {
  likely: { label: 'Sponsorship: Likely — verify', tone: 'success' },
  unknown: { label: 'Sponsorship: Unknown — verify', tone: 'neutral' },
  unlikely: { label: 'Sponsorship: Unlikely — verify', tone: 'warning' },
};

// True when this contact's research has the newer company-identity fields
// (anything processed before them only has a free-text summary).
export function hasCompanyIdentity(company: CompanyIdentity | undefined): company is CompanyIdentity {
  return !!company && !!(company.name || company.description || company.website || company.careersUrl);
}

// "Which company is this?" — the AI's pick with a one-line description and
// clean website/careers links, so the user can tell at a glance it's the
// right one. When the name is ambiguous (low confidence), it offers the
// alternatives it considered; picking one calls onPick. The sponsorship
// estimate is always labeled "verify", never stated as fact.
export function CompanyInfo({
  company,
  onPick,
  correctHint,
}: {
  company: CompanyIdentity;
  onPick: (choice: CompanyCandidate) => void;
  correctHint?: string;
}) {
  const theme = useTheme();
  const needsPick = company.confidence === 'low' && !company.userConfirmed;

  return (
    <View style={styles.container}>
      <View style={styles.labelRowBetween}>
        <View style={styles.labelRow}>
          <Ionicons name="business-outline" size={14} color={theme.textMuted} />
          <ThemedText type="label" themeColor="textMuted">
            Company
          </ThemedText>
        </View>
        {company.userConfirmed ? (
          <Badge label="Confirmed by you" tone="success" />
        ) : company.confidence === 'high' ? (
          <Badge label="Confident match" tone="success" />
        ) : company.confidence === 'low' ? (
          <Badge label="Not sure — check" tone="warning" />
        ) : null}
      </View>

      {!!company.name && <ThemedText type="bodyBold">{company.name}</ThemedText>}
      {!!company.description && (
        <ThemedText type="body" themeColor="textMuted">
          {company.description}
        </ThemedText>
      )}

      {(!!company.website || !!company.careersUrl) && (
        <View style={styles.chipRow}>
          {!!company.website && <ExternalLinkRow url={company.website} variant="chip" />}
          {!!company.careersUrl && <ExternalLinkRow url={company.careersUrl} variant="chip" />}
        </View>
      )}

      {!!company.sponsorship && (
        <View style={styles.sponsorship}>
          <Badge
            label={SPONSORSHIP_LABEL[company.sponsorship.likelihood].label}
            tone={SPONSORSHIP_LABEL[company.sponsorship.likelihood].tone}
          />
          {!!company.sponsorship.note && (
            <ThemedText type="caption" themeColor="textMuted">
              {company.sponsorship.note}
            </ThemedText>
          )}
        </View>
      )}

      {needsPick && (
        <View style={[styles.pickBox, { borderColor: theme.border }]}>
          <ThemedText type="bodyBold">Is this the right company?</ThemedText>
          {!!company.name && (
            <Button
              label={`Yes, ${company.name}`}
              icon="checkmark"
              variant="secondary"
              onPress={() =>
                onPick({ name: company.name!, description: company.description ?? '', website: company.website })
              }
            />
          )}
          {!!company.alternatives?.length && (
            <>
              <ThemedText type="caption" themeColor="textMuted">
                Or did you mean:
              </ThemedText>
              {company.alternatives.map((alt) => (
                <Pressable
                  key={alt.name}
                  onPress={() => onPick(alt)}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.altRow,
                    { borderColor: theme.border },
                    (pressed || hovered) && { backgroundColor: theme.surfaceMuted },
                  ]}>
                  <View style={styles.flexShrink}>
                    <ThemedText type="bodyBold">{alt.name}</ThemedText>
                    {!!alt.description && (
                      <ThemedText type="caption" themeColor="textMuted">
                        {alt.description}
                      </ThemedText>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                </Pressable>
              ))}
            </>
          )}
          {!!correctHint && (
            <ThemedText type="caption" themeColor="textMuted">
              {correctHint}
            </ThemedText>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
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
  sponsorship: {
    gap: Spacing.half,
    alignItems: 'flex-start',
  },
  pickBox: {
    marginTop: Spacing.one,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    gap: Spacing.two,
  },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    padding: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.medium,
    minHeight: 44,
  },
  flexShrink: {
    flexShrink: 1,
  },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describeAiError } from '@/lib/ai-errors';

// Shows a plain-language headline for an ai_error string (e.g. "Google AI
// is busy right now...") with the raw technical detail tucked behind a
// "Show details" toggle, rather than dumping the raw error as the primary
// message. React Native has no native <details> element, so this is a
// small tap-to-expand in its place.
export function AiErrorNotice({ error }: { error: string | undefined }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const { headline, detail } = describeAiError(error);

  return (
    <View style={[styles.container, { backgroundColor: theme.warningMuted }]}>
      <View style={styles.headlineRow}>
        <Ionicons name="warning" size={16} color={theme.warning} />
        <ThemedText type="body" themeColor="warning" style={styles.headline}>
          {headline}
        </ThemedText>
      </View>
      {!!detail && (
        <>
          <Pressable onPress={() => setExpanded((prev) => !prev)}>
            <ThemedText type="link" themeColor="textMuted">
              {expanded ? 'Hide details' : 'Show details'}
            </ThemedText>
          </Pressable>
          {expanded && (
            <View style={[styles.detailBox, { backgroundColor: theme.surface }]}>
              <ThemedText type="code">{detail}</ThemedText>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one,
  },
  headline: {
    flexShrink: 1,
  },
  detailBox: {
    padding: Spacing.two,
    borderRadius: Radius.small,
  },
});

import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { describeAiError } from '@/lib/ai-errors';

// Shows a plain-language headline for an ai_error string (e.g. "Google AI
// is busy right now...") with the raw technical detail tucked behind a
// "Show details" toggle, rather than dumping the raw error as the primary
// message. React Native has no native <details> element, so this is a
// small tap-to-expand in its place.
export function AiErrorNotice({ error }: { error: string | undefined }) {
  const [expanded, setExpanded] = useState(false);
  const { headline, detail } = describeAiError(error);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        ⚠️ {headline}
      </ThemedText>
      {!!detail && (
        <>
          <Pressable onPress={() => setExpanded((prev) => !prev)}>
            <ThemedText type="link" themeColor="textSecondary">
              {expanded ? 'Hide details' : 'Show details'}
            </ThemedText>
          </Pressable>
          {expanded && (
            <ThemedView type="backgroundElement" style={styles.detailBox}>
              <ThemedText type="code">{detail}</ThemedText>
            </ThemedView>
          )}
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  detailBox: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
});

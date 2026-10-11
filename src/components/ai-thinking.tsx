import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useTheme } from '@/hooks/use-theme';

// What the AI is (roughly) doing at each stage — process-contact reads the
// photos, identifies the company, then researches roles; generate-followup
// drafts the messages. The app can't see which step the Edge Function is
// actually on, so these just rotate to show it's alive, in pipeline order.
const MESSAGES = {
  process: [
    { emoji: '🪪', text: 'Reading their business card…' },
    { emoji: '🔎', text: 'Looking up the company…' },
    { emoji: '💼', text: 'Finding open roles…' },
    { emoji: '🎯', text: 'Matching roles to your profile…' },
    { emoji: '📝', text: 'Tidying up your notes…' },
  ],
  draft: [
    { emoji: '✍️', text: 'Drafting your LinkedIn note…' },
    { emoji: '💬', text: 'Making it sound like you…' },
    { emoji: '✨', text: 'Polishing the follow-up…' },
  ],
} as const;

// A friendly "AI is working" pill that cycles through the steps above
// every couple of seconds with a quick fade, instead of a bare spinner.
// Free-tier Gemini can take a while (rate-limit retries), so this stays
// put for as long as the work takes.
export function AiThinking({ kind = 'process' }: { kind?: keyof typeof MESSAGES }) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const messages = MESSAGES[kind];
  const [index, setIndex] = useState(0);
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const interval = setInterval(() => {
      if (reduceMotion) {
        setIndex((i) => (i + 1) % messages.length);
        return;
      }
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        setIndex((i) => (i + 1) % messages.length);
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      });
    }, 2200);
    return () => clearInterval(interval);
  }, [messages.length, opacity, reduceMotion]);

  const message = messages[index];

  return (
    <View
      style={[styles.pill, { backgroundColor: theme.funMuted }]}
      accessibilityRole="progressbar"
      accessibilityLabel="AI is working on this contact"
      accessibilityLiveRegion="polite">
      <ActivityIndicator size="small" color={theme.fun} />
      <Animated.View style={[styles.row, { opacity }]}>
        <ThemedText type="body" importantForAccessibility="no">
          {message.emoji}
        </ThemedText>
        <ThemedText type="bodyBold" themeColor="funStrong">
          {message.text}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
});

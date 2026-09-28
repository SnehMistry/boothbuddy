import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BadgeTone = 'hot' | 'warm' | 'cold' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

// `text` is a slightly darker (light-mode only) shade of the same hue than
// `icon` — see the "*Strong" tokens in constants/colors.ts. Small label
// text needs 4.5:1 against its own muted background; a badge's icon (if
// any) or border only needs 3:1, so it can stay the more vivid base tone.
const TONE_COLOR: Record<BadgeTone, { text: ThemeColor; bg: ThemeColor }> = {
  hot: { text: 'hotStrong', bg: 'hotMuted' },
  warm: { text: 'warmStrong', bg: 'warmMuted' },
  cold: { text: 'coldStrong', bg: 'coldMuted' },
  accent: { text: 'accentStrong', bg: 'accentMuted' },
  success: { text: 'successStrong', bg: 'successMuted' },
  warning: { text: 'warningStrong', bg: 'warningMuted' },
  danger: { text: 'dangerStrong', bg: 'dangerMuted' },
  neutral: { text: 'textMuted', bg: 'surfaceMuted' },
};

// A colored status pill — interest level (Hot/Warm/Cold), AI status,
// follow-up status. Never the only signal (label text is always shown
// too), just a fast visual read.
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const theme = useTheme();
  const { text, bg } = TONE_COLOR[tone];

  return (
    <View style={[styles.badge, { backgroundColor: theme[bg] }]}>
      <ThemedText type="label" themeColor={text}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
});

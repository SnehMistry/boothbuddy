import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BadgeTone = 'hot' | 'warm' | 'cold' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE_COLOR: Record<BadgeTone, { fg: ThemeColor; bg: ThemeColor }> = {
  hot: { fg: 'hot', bg: 'hotMuted' },
  warm: { fg: 'warm', bg: 'warmMuted' },
  cold: { fg: 'cold', bg: 'coldMuted' },
  accent: { fg: 'accent', bg: 'accentMuted' },
  success: { fg: 'success', bg: 'successMuted' },
  warning: { fg: 'warning', bg: 'warningMuted' },
  danger: { fg: 'danger', bg: 'dangerMuted' },
  neutral: { fg: 'textMuted', bg: 'surfaceMuted' },
};

// A colored status pill — interest level (Hot/Warm/Cold), AI status,
// follow-up status. Never the only signal (label text is always shown
// too), just a fast visual read.
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const theme = useTheme();
  const { fg, bg } = TONE_COLOR[tone];

  return (
    <View style={[styles.badge, { backgroundColor: theme[bg] }]}>
      <ThemedText type="label" themeColor={fg}>
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

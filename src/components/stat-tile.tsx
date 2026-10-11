import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useCountUp } from '@/hooks/use-count-up';
import { useTheme } from '@/hooks/use-theme';

export type StatTone = 'accent' | 'fun' | 'mint' | 'warning';

const TONES: Record<StatTone, { fg: ThemeColor; text: ThemeColor; bg: ThemeColor }> = {
  accent: { fg: 'accent', text: 'accentStrong', bg: 'accentMuted' },
  fun: { fg: 'fun', text: 'funStrong', bg: 'funMuted' },
  mint: { fg: 'mint', text: 'mintStrong', bg: 'mintMuted' },
  warning: { fg: 'warning', text: 'warningStrong', bg: 'warningMuted' },
};

// One "at a glance" number: an icon bubble, a big number that counts up
// when it loads or changes, and a small label. Each tile gets its own
// tone so a row of them reads as three different things, not one grey
// block repeated.
export function StatTile({
  value,
  label,
  icon,
  tone = 'accent',
  compact,
  style,
}: {
  value: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: StatTone;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const display = useCountUp(value);
  const { fg, text, bg } = TONES[tone];

  return (
    <View
      style={[styles.tile, compact && styles.compact, { backgroundColor: theme[bg] }, style]}
      accessible
      accessibilityLabel={`${value} ${label}`}>
      <View style={[styles.iconBubble, compact && styles.iconBubbleCompact, { backgroundColor: theme.surface }]}>
        <Ionicons name={icon} size={compact ? 14 : 18} color={theme[fg]} />
      </View>
      <ThemedText type="display" themeColor={text} style={compact ? styles.numberCompact : styles.number}>
        {display}
      </ThemedText>
      <ThemedText type="caption" themeColor={text} numberOfLines={2}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    padding: Spacing.three,
    borderRadius: Radius.large,
    gap: Spacing.one,
    minWidth: 0,
  },
  compact: {
    flex: 1,
    padding: Spacing.two + 2,
    gap: 2,
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  iconBubbleCompact: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginBottom: 0,
  },
  number: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  numberCompact: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});

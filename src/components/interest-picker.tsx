import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { INTEREST_LEVELS, type InterestLevel } from '@/lib/types';

// `text` is a slightly darker (light-mode only) shade than `fg` — see the
// "*Strong" tokens in constants/colors.ts. `fg` (the vivid base tone) is
// only used for borders, where 3:1 is the relevant AA threshold; the label
// text on the same muted background needs 4.5:1.
const LEVEL_CONFIG: Record<
  InterestLevel,
  {
    label: string;
    emoji: string;
    fg: ThemeColor;
    text: ThemeColor;
    bg: ThemeColor;
  }
> = {
  hot: { label: 'Hot', emoji: '🔥', fg: 'hot', text: 'hotStrong', bg: 'hotMuted' },
  warm: { label: 'Warm', emoji: '☀️', fg: 'warm', text: 'warmStrong', bg: 'warmMuted' },
  cold: { label: 'Cold', emoji: '❄️', fg: 'cold', text: 'coldStrong', bg: 'coldMuted' },
};

// Hot/Warm/Cold as a proper grouped-pill picker (🔥 / ☀️ / ❄️) with a tone-matched
// color per option, replacing plain text chips that all looked the
// same regardless of which level they represented.
export function InterestPicker({
  value,
  onChange,
}: {
  value: InterestLevel | undefined;
  onChange: (level: InterestLevel) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {INTEREST_LEVELS.map((level) => {
        const config = LEVEL_CONFIG[level];
        const selected = value === level;
        return (
          <Pressable
            key={level}
            onPress={() => {
              haptics.selection();
              onChange(level);
            }}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: selected ? theme[config.bg] : theme.surface,
                borderColor: selected ? theme[config.fg] : theme.border,
              },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="label" style={[styles.emoji, !selected && styles.emojiIdle]}>
              {config.emoji}
            </ThemedText>
            <ThemedText type="label" themeColor={selected ? config.text : 'textMuted'}>
              {config.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

// The emoji is decorative — the label still carries the meaning, so the
// badge reads the same to a screen reader and in grayscale.
export function InterestBadge({ level }: { level: InterestLevel }) {
  const theme = useTheme();
  const config = LEVEL_CONFIG[level];
  return (
    <View
      style={[styles.badge, { backgroundColor: theme[config.bg], borderColor: theme[config.fg] }]}
      accessibilityLabel={`${config.label} lead`}>
      <ThemedText type="label" style={styles.emoji} importantForAccessibility="no">
        {config.emoji}
      </ThemedText>
      <ThemedText type="label" themeColor={config.text}>
        {config.label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  emoji: {
    fontSize: 13,
  },
  emojiIdle: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.8,
  },
});

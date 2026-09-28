import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { INTEREST_LEVELS, type InterestLevel } from '@/lib/types';

// `text` is a slightly darker (light-mode only) shade than `fg` — see the
// "*Strong" tokens in constants/colors.ts. The icon can stay the more
// vivid base tone (3:1 is the relevant AA threshold there); the label text
// on the same muted background needs 4.5:1.
const LEVEL_CONFIG: Record<
  InterestLevel,
  { label: string; icon: keyof typeof Ionicons.glyphMap; fg: ThemeColor; text: ThemeColor; bg: ThemeColor }
> = {
  hot: { label: 'Hot', icon: 'flame', fg: 'hot', text: 'hotStrong', bg: 'hotMuted' },
  warm: { label: 'Warm', icon: 'partly-sunny', fg: 'warm', text: 'warmStrong', bg: 'warmMuted' },
  cold: { label: 'Cold', icon: 'snow', fg: 'cold', text: 'coldStrong', bg: 'coldMuted' },
};

// Hot/Warm/Cold as a proper grouped-pill picker with a tone-matched icon
// and color per option, replacing plain text chips that all looked the
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
            <Ionicons name={config.icon} size={14} color={selected ? theme[config.fg] : theme.textMuted} />
            <ThemedText type="label" themeColor={selected ? config.text : 'textMuted'}>
              {config.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function InterestBadge({ level }: { level: InterestLevel }) {
  const theme = useTheme();
  const config = LEVEL_CONFIG[level];
  return (
    <View style={[styles.badge, { backgroundColor: theme[config.bg] }]}>
      <Ionicons name={config.icon} size={12} color={theme[config.fg]} />
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
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.8,
  },
});

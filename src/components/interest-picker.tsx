import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { INTEREST_LEVELS, type InterestLevel } from '@/lib/types';

const LEVEL_CONFIG: Record<
  InterestLevel,
  { label: string; icon: keyof typeof Ionicons.glyphMap; fg: ThemeColor; bg: ThemeColor }
> = {
  hot: { label: 'Hot', icon: 'flame', fg: 'hot', bg: 'hotMuted' },
  warm: { label: 'Warm', icon: 'partly-sunny', fg: 'warm', bg: 'warmMuted' },
  cold: { label: 'Cold', icon: 'snow', fg: 'cold', bg: 'coldMuted' },
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
            onPress={() => onChange(level)}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: selected ? theme[config.bg] : theme.surface,
                borderColor: selected ? theme[config.fg] : theme.border,
              },
              pressed && styles.pressed,
            ]}>
            <Ionicons name={config.icon} size={14} color={selected ? theme[config.fg] : theme.textMuted} />
            <ThemedText type="label" themeColor={selected ? config.fg : 'textMuted'}>
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
      <ThemedText type="label" themeColor={config.fg}>
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

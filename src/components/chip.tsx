import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// A tappable pill — used for tone/interest/filter selection (via
// `selected`) and for plain topic tags (omit onPress/selected). Replaces
// the ad hoc "border + conditional style" chip markup that used to be
// copy-pasted into every screen with its own slightly different look.
export function Chip({
  label,
  selected,
  onPress,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const content = (
    <ThemedText type="label" themeColor={selected ? 'accent' : 'textMuted'}>
      {label}
    </ThemedText>
  );

  const chipStyle = [
    styles.chip,
    {
      borderColor: selected ? theme.accent : theme.border,
      backgroundColor: selected ? theme.accentMuted : theme.surface,
    },
    style,
  ];

  if (!onPress) {
    return (
      <View style={[styles.tag, { backgroundColor: theme.surfaceMuted }, style]}>
        <ThemedText type="label" themeColor="textMuted">
          {label}
        </ThemedText>
      </View>
    );
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [chipStyle, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  tag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.small,
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.7,
  },
});

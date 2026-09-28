import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';

// A real checkbox row (icon + label), replacing the ☐/☑ unicode
// characters used for action items and jobs — those render as whatever
// glyph the platform's default font happens to have for them, which reads
// as a bug more than a design choice on some devices/browsers.
export function Checkbox({
  label,
  checked,
  onPress,
  strikeThroughWhenChecked = true,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  strikeThroughWhenChecked?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Ionicons
        name={checked ? 'checkbox' : 'square-outline'}
        size={20}
        color={checked ? theme.accent : theme.textMuted}
      />
      <ThemedText
        type="body"
        themeColor={checked ? 'textMuted' : 'text'}
        style={[
          styles.label,
          checked && strikeThroughWhenChecked ? styles.strikeThrough : undefined,
        ]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    minHeight: 44,
  },
  label: {
    flexShrink: 1,
  },
  strikeThrough: {
    textDecorationLine: 'line-through',
  },
  pressed: {
    opacity: 0.6,
  },
});

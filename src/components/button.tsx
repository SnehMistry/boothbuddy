import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

// The one button used everywhere — every screen used to hand-roll its own
// Pressable + colored View + ThemedText combination, each slightly
// different. `variant` picks the visual weight; `icon` is an optional
// Ionicons name shown before the label; `loading` swaps the label for a
// spinner without changing the button's size.
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const backgroundColor = {
    primary: theme.accent,
    secondary: theme.surfaceMuted,
    danger: theme.danger,
    ghost: 'transparent',
  }[variant];

  const textColor =
    variant === 'primary' || variant === 'danger'
      ? '#FFFFFF'
      : variant === 'ghost'
        ? theme.accent
        : theme.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor },
        variant === 'ghost' && styles.ghostPadding,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={16} color={textColor} />}
          <ThemedText type="bodyBold" style={{ color: textColor }}>
            {label}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    alignSelf: 'flex-start',
  },
  ghostPadding: {
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});

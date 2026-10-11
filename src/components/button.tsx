import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandGradient, GradientTextOn } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { usePressScale } from '@/hooks/use-press-scale';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'danger' | 'ghost';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// The one button used everywhere — every screen used to hand-roll its own
// Pressable + colored View + ThemedText combination, each slightly
// different. `variant` picks the visual weight; `icon` is an optional
// Ionicons name shown before the label; `loading` swaps the label for a
// spinner without changing the button's size.
//
// Primary is filled with the brand gradient (white text is ≥5:1 on both
// stops — the old flat accent blue was only 3.5:1). Every variant springs
// down slightly while pressed and gives a light haptic tap on the phone.
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  pill,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  /** Fully rounded and a little more compact — for toolbars. */
  pill?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const { scale, onPressIn, onPressOut } = usePressScale();
  const [hovered, setHovered] = useState(false);

  const backgroundColor = {
    primary: BrandGradient[0],
    secondary: theme.surfaceMuted,
    soft: theme.accentMuted,
    danger: theme.danger,
    ghost: 'transparent',
  }[variant];

  const textColor =
    variant === 'primary' || variant === 'danger'
      ? GradientTextOn
      : variant === 'ghost' || variant === 'soft'
        ? theme.accentStrong
        : theme.text;

  return (
    <AnimatedPressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      disabled={isDisabled}
      accessibilityRole="button"
      style={[
        styles.button,
        { backgroundColor },
        variant === 'ghost' && styles.ghostPadding,
        pill && styles.pill,
        variant === 'primary' && styles.primaryShadow,
        isDisabled && styles.disabled,
        hovered && !isDisabled && styles.hovered,
        style,
        // Web hover lifts the button a pixel; pressing springs it down.
        { transform: [{ translateY: hovered && !isDisabled ? -1 : 0 }, { scale }] },
      ]}>
      {variant === 'primary' && (
        <LinearGradient
          colors={BrandGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius:
                StyleSheet.flatten(style)?.borderRadius ?? (pill ? Radius.pill : Radius.medium),
            },
          ]}
        />
      )}
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={pill ? 15 : 16} color={textColor} />}
          <ThemedText type={pill ? 'label' : 'bodyBold'} style={{ color: textColor }}>
            {label}
          </ThemedText>
        </>
      )}
    </AnimatedPressable>
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
  primaryShadow: Platform.select({
    web: { boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)' } as object,
    default: {
      shadowColor: '#4F46E5',
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
  }),
  ghostPadding: {
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
  },
  disabled: {
    opacity: 0.5,
  },
  pill: {
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two + 4,
    alignSelf: 'center',
  },
  hovered: {
    opacity: 0.92,
  },
});

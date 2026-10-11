import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The one card container used everywhere (event cards, contact cards, the
// AI card's sections) — a surface fill, a hairline border, and a soft
// shadow, instead of every screen inventing its own "grey box" styling.
export function Card({
  children,
  onPress,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const theme = useTheme();
  const cardStyle = [
    styles.card,
    padded && styles.padded,
    { backgroundColor: theme.surface, borderColor: theme.border },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          cardStyle,
          hovered && !pressed && [styles.lifted, { borderColor: theme.accent }],
          pressed && styles.pressed,
        ]}>
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const cardShadow = Platform.select({
  web: { boxShadow: '0 1px 3px rgba(16, 20, 30, 0.06)' } as object,
  default: {
    shadowColor: '#0B0E14',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
});

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    borderWidth: 1,
    ...cardShadow,
    ...Platform.select({
      web: { transitionProperty: 'transform, box-shadow, border-color', transitionDuration: '160ms' } as object,
      default: {},
    }),
  },
  padded: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  // Web hover: the card rises a couple of pixels with a deeper shadow, so
  // it's obvious it's clickable.
  lifted: Platform.select({
    web: {
      transform: [{ translateY: -2 }],
      boxShadow: '0 8px 22px rgba(16, 20, 30, 0.10)',
    } as object,
    default: {},
  }),
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
});

import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

// A thin 1px rule to separate sections within one card, instead of
// wrapping every section in its own bordered/shadowed box — fewer stacked
// "boxes," more whitespace-led hierarchy.
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return <View style={[styles.line, { backgroundColor: theme.border }, style]} />;
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
});

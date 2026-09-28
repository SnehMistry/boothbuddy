import { View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  type?: ThemeColor;
};

// `type` is opt-in on purpose: most uses of ThemedView are plain layout
// wrappers (a row, a section) that should stay transparent, not a
// deliberate colored surface. Defaulting the missing case to the
// `background` token used to mean every untyped ThemedView rendered pure
// black in dark mode (background: '#000') — a real bug, not a style
// choice, and exactly what showed up as "harsh black boxes" inside cards.
export function ThemedView({ style, type, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();

  return (
    <View
      style={[type ? { backgroundColor: theme[type] } : null, style]}
      {...otherProps}
    />
  );
}

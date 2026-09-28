import { Text, type TextProps } from 'react-native';

import { ThemeColor, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextType = keyof typeof Typography;

export type ThemedTextProps = TextProps & {
  type?: ThemedTextType;
  themeColor?: ThemeColor;
};

// One typography scale (see constants/theme.ts's Typography) instead of
// each screen picking its own font sizes — `type` picks a rung on that
// scale, `themeColor` overrides the color token (defaults to `text`).
export function ThemedText({ style, type = 'body', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[{ color: theme[themeColor ?? 'text'] }, Typography[type], style]}
      {...rest}
    />
  );
}

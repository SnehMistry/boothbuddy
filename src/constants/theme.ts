/**
 * BoothBuddy's design tokens: one color system (light + dark), one
 * typography scale, and a shared spacing/radius scale. Every screen pulls
 * from here rather than hardcoding hex values or font sizes, so the app
 * reads as one consistent product instead of a pile of one-off screens.
 */

import '@/global.css';

import { Platform } from 'react-native';

export { Colors, type ThemeColor } from '@/constants/colors';

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
})!;

// One typography scale, used by ThemedText's `type` prop. System font,
// deliberately — a custom font (e.g. Inter via expo-font) would need an
// async load gate before first paint for marginal gain over a well-defined
// system-font scale; not worth it against everything else in this pass.
export const Typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700' as const },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  heading: { fontSize: 17, lineHeight: 23, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyBold: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  label: { fontSize: 13, lineHeight: 17, fontWeight: '600' as const, letterSpacing: 0.2 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  link: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  code: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.mono },
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 8,
  medium: 12,
  large: 16,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

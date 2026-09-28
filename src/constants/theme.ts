/**
 * BoothBuddy's design tokens: one color system (light + dark), one
 * typography scale, and a shared spacing/radius scale. Every screen pulls
 * from here rather than hardcoding hex values or font sizes, so the app
 * reads as one consistent product instead of a pile of one-off screens.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#F5F6F9', // app canvas — not stark white, gives cards somewhere to sit
    surface: '#FFFFFF', // card / sheet backgrounds
    surfaceMuted: '#EEF0F4', // tags, secondary surfaces, table header rows
    border: '#E1E4EA',
    text: '#161A22',
    textMuted: '#666C7A',
    accent: '#3C87F7',
    accentMuted: '#E9F1FE',
    success: '#1E8E5A',
    successMuted: '#E7F6EE',
    warning: '#B4740E',
    warningMuted: '#FCF1DC',
    danger: '#D0473E',
    dangerMuted: '#FBEAE9',
    hot: '#D0473E',
    hotMuted: '#FBEAE9',
    warm: '#B4740E',
    warmMuted: '#FCF1DC',
    cold: '#3C87F7',
    coldMuted: '#E9F1FE',
  },
  dark: {
    background: '#0C0E13',
    surface: '#171A21',
    surfaceMuted: '#1F232C',
    border: '#2B303B',
    text: '#F1F2F5',
    textMuted: '#9BA1AF',
    accent: '#5B9DFA',
    accentMuted: '#17243B',
    success: '#3FBE7E',
    successMuted: '#123423',
    warning: '#E3A73E',
    warningMuted: '#332708',
    danger: '#F0685F',
    dangerMuted: '#3A1917',
    hot: '#F0685F',
    hotMuted: '#3A1917',
    warm: '#E3A73E',
    warmMuted: '#332708',
    cold: '#5B9DFA',
    coldMuted: '#17243B',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

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

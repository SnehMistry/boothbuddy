// Split out from theme.ts (which pulls in global.css for web font vars) so
// this can be imported by plain Node tooling — e.g. scripts/check-contrast.mjs
// — without dragging in a CSS import that only makes sense inside the app.
//
// The "*Strong" tokens are a slightly darker (light mode only) shade of the
// same hue, used ONLY for small label text sitting on that tone's own
// *Muted background (badges/pills) — the vivid base tone stays exactly as
// designed for icons, borders, and larger surfaces, where 3:1 is the
// relevant AA threshold rather than 4.5:1. See scripts/check-contrast.mjs.
export const Colors = {
  light: {
    background: '#F5F6F9', // app canvas — not stark white, gives cards somewhere to sit
    surface: '#FFFFFF', // card / sheet backgrounds
    surfaceMuted: '#EEF0F4', // tags, secondary surfaces, table header rows
    border: '#E1E4EA',
    text: '#161A22',
    textMuted: '#5B616E',
    accent: '#3C87F7',
    accentMuted: '#E9F1FE',
    accentStrong: '#306CC6',
    success: '#1E8E5A',
    successMuted: '#E7F6EE',
    successStrong: '#1A7D4F',
    warning: '#8A5A0B',
    warningMuted: '#FCF1DC',
    warningStrong: '#8A5A0B',
    danger: '#D0473E',
    dangerMuted: '#FBEAE9',
    dangerStrong: '#BB4038',
    hot: '#D0473E',
    hotMuted: '#FBEAE9',
    hotStrong: '#BB4038',
    warm: '#8A5A0B',
    warmMuted: '#FCF1DC',
    warmStrong: '#8A5A0B',
    cold: '#3C87F7',
    coldMuted: '#E9F1FE',
    coldStrong: '#306CC6',
    // Fun accents — used sparingly (stat tiles, empty states, badges),
    // never as the main UI color. Brand blue stays the primary.
    fun: '#7A5AF8',
    funMuted: '#F1EDFF',
    funStrong: '#6941D9',
    mint: '#12A27A',
    mintMuted: '#E3F7F0',
    mintStrong: '#0E7A5C',
  },
  dark: {
    background: '#0C0E13',
    surface: '#171A21',
    surfaceMuted: '#1F232C',
    border: '#2B303B',
    text: '#F1F2F5',
    textMuted: '#AAB0BE',
    accent: '#5B9DFA',
    accentMuted: '#17243B',
    accentStrong: '#5B9DFA',
    success: '#3FBE7E',
    successMuted: '#123423',
    successStrong: '#3FBE7E',
    warning: '#E3A73E',
    warningMuted: '#332708',
    warningStrong: '#E3A73E',
    danger: '#F0685F',
    dangerMuted: '#3A1917',
    dangerStrong: '#F0685F',
    hot: '#F0685F',
    hotMuted: '#3A1917',
    hotStrong: '#F0685F',
    warm: '#E3A73E',
    warmMuted: '#332708',
    warmStrong: '#E3A73E',
    cold: '#5B9DFA',
    coldMuted: '#17243B',
    coldStrong: '#5B9DFA',
    fun: '#A891FF',
    funMuted: '#241D42',
    funStrong: '#A891FF',
    mint: '#41D1A3',
    mintMuted: '#0F2E25',
    mintStrong: '#41D1A3',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// The friendly brand gradient (blue → violet), used sparingly: the primary
// button, the header/brand mark, and empty-state illustrations. Same stops
// in light and dark mode — both carry white text at ≥5:1 (AA), unlike the
// flat `accent` blue, which is only 3.5:1 against white.
export const BrandGradient = ['#2563EB', '#6D4AE8'] as const;
export const GradientTextOn = '#FFFFFF';

// Avatar colors: each name hashes to one of these so the same person always
// gets the same color, and a busy list is easy to scan. `fg` on `bg` is
// checked for AA (4.5:1) in scripts/check-contrast.mjs.
export const AvatarPalette = {
  light: [
    { bg: '#E3EEFF', fg: '#1D5FC9' },
    { bg: '#EFE9FF', fg: '#6339D1' },
    { bg: '#DDF5EC', fg: '#0B7556' },
    { bg: '#FFE7E1', fg: '#B23A2E' },
    { bg: '#FFF0D1', fg: '#8A5300' },
    { bg: '#FFE4F0', fg: '#B02A6B' },
    { bg: '#DDF3F6', fg: '#0B6E7A' },
    { bg: '#E7E8FF', fg: '#4A4FC4' },
  ],
  dark: [
    { bg: '#1A2A47', fg: '#8DB8FF' },
    { bg: '#2A2149', fg: '#B9A3FF' },
    { bg: '#0F3328', fg: '#5FD9B0' },
    { bg: '#3F1C17', fg: '#FF9C8C' },
    { bg: '#3A2A0B', fg: '#F5C066' },
    { bg: '#3D1A2C', fg: '#FF8FC4' },
    { bg: '#0E3238', fg: '#5CD2E0' },
    { bg: '#22244A', fg: '#A9ADFF' },
  ],
} as const;

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
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

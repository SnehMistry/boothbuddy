// WCAG AA contrast check for every text/background token pair actually used
// by ThemedText/Badge/Chip/etc. Run with `node scripts/check-contrast.mjs`.
// Fails (non-zero exit) if any pair used for real text is below the AA
// threshold for its size (4.5:1 normal text, 3:1 for large/bold-large text).

import { Colors } from '../src/constants/colors.ts';

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = srgbToLinear((n >> 16) & 255);
  const g = srgbToLinear((n >> 8) & 255);
  const b = srgbToLinear(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

// [foreground token, background token, minimum ratio, note]
const PAIRS = [
  ['text', 'background', 4.5, 'body text on app canvas'],
  ['text', 'surface', 4.5, 'body text on cards'],
  ['textMuted', 'background', 4.5, 'muted text on app canvas'],
  ['textMuted', 'surface', 4.5, 'muted text on cards'],
  ['textMuted', 'surfaceMuted', 4.5, 'muted text on muted surfaces (tags)'],
  ['accent', 'background', 3, 'accent link/icon on app canvas (large/bold)'],
  ['accent', 'surface', 3, 'accent link/icon on cards (large/bold)'],
  ['accentStrong', 'accentMuted', 4.5, 'accent badge text on its own muted bg'],
  ['successStrong', 'successMuted', 4.5, 'success badge text on its own muted bg'],
  ['warningStrong', 'warningMuted', 4.5, 'warning badge text on its own muted bg'],
  ['dangerStrong', 'dangerMuted', 4.5, 'danger badge text on its own muted bg'],
  ['hotStrong', 'hotMuted', 4.5, 'hot badge text on its own bg'],
  ['warmStrong', 'warmMuted', 4.5, 'warm badge text on its own bg'],
  ['coldStrong', 'coldMuted', 4.5, 'cold badge text on its own bg'],
];

let failed = false;
for (const mode of ['light', 'dark']) {
  const tokens = Colors[mode];
  console.log(`\n${mode}:`);
  for (const [fg, bg, min, note] of PAIRS) {
    const ratio = contrastRatio(tokens[fg], tokens[bg]);
    const pass = ratio >= min;
    if (!pass) failed = true;
    console.log(
      `  ${pass ? 'PASS' : 'FAIL'} ${fg.padEnd(11)} on ${bg.padEnd(13)} ${ratio.toFixed(2)}:1 (need ${min}:1) — ${note}`,
    );
  }
}

if (failed) {
  console.error('\nOne or more token pairs failed WCAG AA contrast.');
  process.exit(1);
} else {
  console.log('\nAll token pairs pass WCAG AA contrast.');
}

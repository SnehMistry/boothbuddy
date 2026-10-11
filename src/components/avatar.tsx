import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AvatarPalette } from '@/constants/colors';
import { useThemePreference } from '@/lib/theme-preference';

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Simple string hash → palette index, so the same name always gets the
// same color (on every device and every reload) without storing anything.
export function avatarIndexFor(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(hash) % AvatarPalette.light.length;
}

// A colored initials circle for a contact's name — each person gets their
// own color, which makes a busy list of names much faster to scan.
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const { resolvedScheme } = useThemePreference();
  const { bg, fg } = AvatarPalette[resolvedScheme][avatarIndexFor(name.trim().toLowerCase())];
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}>
      <ThemedText type="label" style={{ color: fg, fontSize: size * 0.36, lineHeight: size * 0.44 }}>
        {initialsFor(name || '?')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

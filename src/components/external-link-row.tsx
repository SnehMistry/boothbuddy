import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { openExternalLink } from '@/lib/links';
import { displayUrl } from '@/lib/url';

// A tappable link — either an inline "hostname/path ↗" row (default), or a
// bordered "domain chip" (`variant="chip"`) for contexts like the company
// URL field where a pill reads more like a clean fact than a paragraph link.
export function ExternalLinkRow({
  url,
  label,
  variant = 'link',
  style,
}: {
  url: string;
  label?: string;
  variant?: 'link' | 'chip';
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const text = label ?? displayUrl(url);

  if (variant === 'chip') {
    return (
      <Pressable
        onPress={() => openExternalLink(url)}
        style={({ pressed }) => [
          styles.chip,
          { borderColor: theme.border, backgroundColor: theme.surfaceMuted },
          pressed && styles.pressed,
          style,
        ]}>
        <Ionicons name="globe-outline" size={13} color={theme.textMuted} />
        <ThemedText type="label" themeColor="text" numberOfLines={1} style={styles.chipText}>
          {text}
        </ThemedText>
        <Ionicons name="open-outline" size={12} color={theme.textMuted} />
      </Pressable>
    );
  }

  return (
    <Pressable onPress={() => openExternalLink(url)} style={[styles.row, style]}>
      <Ionicons name="open-outline" size={14} color={theme.accent} />
      <ThemedText type="link" themeColor="accentStrong" numberOfLines={1} style={styles.text}>
        {text}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  text: {
    flexShrink: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chipText: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});

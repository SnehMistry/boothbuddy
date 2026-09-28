import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Cleans a URL for display: strips the protocol, "www.", and any query
// string (tracking params like utm_source are common on the company-URL
// links this renders and are pure noise to a human reader). Falls back to
// the raw string if it isn't a parseable URL.
export function displayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname === '/' ? '' : parsed.pathname;
    return `${host}${path}`;
  } catch {
    return url;
  }
}

// A tappable "hostname/path ↗" row instead of dumping a raw URL (with
// utm_ query-string junk) onto the screen.
export function ExternalLinkRow({ url, label }: { url: string; label?: string }) {
  const theme = useTheme();
  return (
    <Pressable onPress={() => Linking.openURL(url)} style={styles.row}>
      <Ionicons name="open-outline" size={14} color={theme.accent} />
      <ThemedText type="link" themeColor="accent" numberOfLines={1} style={styles.text}>
        {label ?? displayUrl(url)}
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
});

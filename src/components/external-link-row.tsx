import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { displayUrl } from '@/lib/url';

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

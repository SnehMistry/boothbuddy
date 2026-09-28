import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// Shown instead of the app when required config (currently: the Supabase
// URL/key) is missing, so a misconfigured build fails loudly with a
// readable message instead of crashing on launch before React renders
// anything — see src/lib/supabase.ts's supabaseConfigError.
export function ConfigErrorScreen({ message }: { message: string }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">⚠️ Configuration error</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {message}
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
  },
  card: {
    gap: Spacing.two,
    maxWidth: 480,
  },
});

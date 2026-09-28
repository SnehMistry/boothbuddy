import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Shown instead of the app when required config (currently: the Supabase
// URL/key) is missing, so a misconfigured build fails loudly with a
// readable message instead of crashing on launch before React renders
// anything — see src/lib/supabase.ts's supabaseConfigError.
export function ConfigErrorScreen({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Ionicons name="warning" size={32} color={theme.danger} />
        <ThemedText type="title">Configuration error</ThemedText>
        <ThemedText type="body" themeColor="textMuted">
          {message}
        </ThemedText>
      </View>
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
    alignItems: 'center',
  },
});

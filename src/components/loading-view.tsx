import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

// A plain `return null` while data loads leaves a blank flash where the
// screen's chrome (header, sidebar) is already visible — this fills that
// gap with a spinner instead, for every screen that loads its data after
// mount rather than having it available synchronously.
export function LoadingView() {
  const theme = useTheme();
  return (
    <ThemedView type="background" style={styles.container}>
      <ActivityIndicator color={theme.accent} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

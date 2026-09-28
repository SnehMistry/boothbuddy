import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// A small local toast (not a global/portal system — each screen that needs
// one owns its own via this hook) for lightweight confirmations like
// "Copied!" that don't need a blocking Alert.
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMessage(text);
    timeoutRef.current = setTimeout(() => setMessage(null), 1800);
  }, []);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return { toastMessage: message, showToast };
}

export function Toast({ message }: { message: string | null }) {
  const theme = useTheme();
  // useState's lazy initializer (not useRef) — reading ref.current during
  // render trips the react-hooks/refs lint rule under the React Compiler.
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: message ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [message, opacity]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.toast, { backgroundColor: theme.text, opacity }]}>
      <ThemedText type="label" themeColor="background">
        {message}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: Spacing.five,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    zIndex: 1000,
  },
});

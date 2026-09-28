import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// A pulsing placeholder block — used in place of a blank screen or a bare
// spinner while a list's first page of data loads, so the layout the
// content will land in is visible immediately.
function SkeletonBlock({ width, height }: { width: number | `${number}%`; height: number }) {
  const theme = useTheme();
  // useState's lazy initializer (not useRef) — reading ref.current during
  // render trips the react-hooks/refs lint rule under the React Compiler.
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        { width, height, backgroundColor: theme.surfaceMuted, opacity },
      ]}
    />
  );
}

// A skeleton for one "card row" (e.g. an event or contact list item):
// avatar-sized block + two text-line-sized blocks.
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <SkeletonBlock width={40} height={40} />
      <View style={styles.lines}>
        <SkeletonBlock width="60%" height={14} />
        <SkeletonBlock width="40%" height={12} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderRadius: Radius.small,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  lines: {
    flex: 1,
    gap: Spacing.one,
  },
  list: {
    gap: Spacing.one,
  },
});

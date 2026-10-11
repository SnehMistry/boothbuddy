import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { BrandGradient } from '@/constants/colors';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// A thin rounded progress bar with the brand gradient fill, which slides
// smoothly to its new width whenever `value` (0–1) changes.
export function ProgressBar({ value }: { value: number }) {
  const theme = useTheme();
  const [width] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // Width can't use the native driver — it's a layout property.
    Animated.timing(width, { toValue: Math.max(0, Math.min(1, value)), duration: 400, useNativeDriver: false }).start();
  }, [value, width]);

  return (
    <View
      style={[styles.track, { backgroundColor: theme.surfaceMuted }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}>
      <Animated.View
        style={[styles.fill, { width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}>
        <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
});

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { BrandGradient } from '@/constants/colors';
import { Spacing } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';

// A friendly "nothing here yet" moment: a big emoji floating on a soft
// brand-gradient blob, an encouraging headline, and (optionally) the one
// action that fixes it. Used instead of a lone grey icon + "No X yet".
export function EmptyState({
  emoji,
  title,
  body,
  actionLabel,
  onAction,
  compact,
  style,
}: {
  emoji: string;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReduceMotion();
  // useState's lazy initializer (not useRef) — reading ref.current during
  // render trips the react-hooks/refs lint rule under the React Compiler.
  const [float] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float, reduceMotion]);

  const size = compact ? 72 : 96;
  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  return (
    <View style={[styles.container, style]}>
      <View style={{ width: size, height: size }}>
        <LinearGradient
          colors={BrandGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.blob, { borderRadius: size / 2 }]}
        />
        <Animated.View style={[styles.emojiWrap, { transform: [{ translateY }] }]}>
          <ThemedText style={{ fontSize: size * 0.46, lineHeight: size * 0.6 }} importantForAccessibility="no">
            {emoji}
          </ThemedText>
        </Animated.View>
      </View>
      <ThemedText type={compact ? 'heading' : 'title'} style={styles.center}>
        {title}
      </ThemedText>
      {!!body && (
        <ThemedText type="body" themeColor="textMuted" style={[styles.center, styles.body]}>
          {body}
        </ThemedText>
      )}
      {!!actionLabel && !!onAction && (
        <Button label={actionLabel} onPress={onAction} style={styles.action} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    gap: Spacing.two,
  },
  blob: {
    opacity: 0.18,
  },
  emojiWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
  body: {
    maxWidth: 360,
  },
  action: {
    alignSelf: 'center',
    marginTop: Spacing.two,
  },
});

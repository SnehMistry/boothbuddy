import { useState } from 'react';
import { Animated } from 'react-native';

// A springy "press down" for anything tappable: scales to `pressedScale`
// while the finger is down and bounces back on release. Returns the
// Animated value to put in a `transform`, plus the two Pressable handlers.
export function usePressScale(pressedScale = 0.96) {
  // useState's lazy initializer (not useRef) — reading ref.current during
  // render trips the react-hooks/refs lint rule under the React Compiler.
  const [scale] = useState(() => new Animated.Value(1));

  const springTo = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 8 }).start();

  return {
    scale,
    onPressIn: () => springTo(pressedScale),
    onPressOut: () => springTo(1),
  };
}

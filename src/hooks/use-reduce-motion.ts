import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// True when the user has asked their OS for less motion (iOS/Android
// accessibility setting, or `prefers-reduced-motion` on web). Decorative
// animations — count-ups, confetti, floating emoji — check this and skip
// straight to their end state.
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => mounted && setReduce(value))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      sub?.remove();
    };
  }, []);

  return reduce;
}

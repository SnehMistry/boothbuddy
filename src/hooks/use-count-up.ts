import { useEffect, useRef, useState } from 'react';

import { useReduceMotion } from '@/hooks/use-reduce-motion';

// Animates a number from wherever it was to `target` (ease-out over
// `duration` ms) — stat tiles count up on load instead of popping in.
export function useCountUp(target: number, duration = 800) {
  const reduceMotion = useReduceMotion();
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduceMotion) return;
    const from = fromRef.current;
    const start = Date.now();
    let frame: number;
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(from + (target - from) * eased);
      setValue(next);
      fromRef.current = next;
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduceMotion]);

  return reduceMotion ? target : value;
}

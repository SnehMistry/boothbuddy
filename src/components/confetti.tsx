import { useCallback, useEffect, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { haptics } from '@/lib/haptics';

const COLORS = ['#2563EB', '#6D4AE8', '#12A27A', '#F5B83D', '#F0685F', '#FF8FC4'];
const PIECES = 42;

export type ConfettiBurst = { id: number; pieces: Piece[] };
type Piece = { x: number; drift: number; spin: number; delay: number; color: string; w: number; h: number };

function makePieces(width: number): Piece[] {
  return Array.from({ length: PIECES }, (_, i) => ({
    x: Math.random() * width,
    drift: (Math.random() - 0.5) * 160,
    spin: (Math.random() - 0.5) * 900,
    delay: Math.random() * 250,
    color: COLORS[i % COLORS.length],
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
  }));
}

// `celebrate()` fires one burst; render `<Confetti burst={burst} />` once
// near the root of the screen. Same local-hook pattern as useToast — each
// screen that celebrates owns its own, no global provider.
export function useConfetti() {
  const [burst, setBurst] = useState<ConfettiBurst | null>(null);
  const celebrate = useCallback(() => {
    haptics.success();
    // Random layout is made here, in the event handler, not during render.
    setBurst((prev) => ({ id: (prev?.id ?? 0) + 1, pieces: makePieces(Dimensions.get('window').width) }));
  }, []);
  return { burst, celebrate };
}

// A short burst of falling paper confetti over the whole screen. Purely
// decorative: it never takes touches, and it's skipped entirely when the
// user has reduced motion turned on.
export function Confetti({ burst }: { burst: ConfettiBurst | null }) {
  const { height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(0));
  const [finishedId, setFinishedId] = useState(0);

  useEffect(() => {
    if (!burst || reduceMotion) return;
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 2200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => finished && setFinishedId(burst.id));
    return () => anim.stop();
  }, [burst, reduceMotion, progress]);

  if (!burst || reduceMotion || finishedId === burst.id) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {burst.pieces.map((piece, i) => {
        const start = piece.delay / 2200;
        const p = progress.interpolate({
          inputRange: [0, start, 1],
          outputRange: [0, 0, 1],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: piece.x,
              top: -20,
              width: piece.w,
              height: piece.h,
              borderRadius: 2,
              backgroundColor: piece.color,
              opacity: p.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
                { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, piece.drift] }) },
                {
                  rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${piece.spin}deg`] }),
                },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    overflow: 'hidden',
  },
});

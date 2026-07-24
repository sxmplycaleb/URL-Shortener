import { useEffect, useRef, useState } from "react";

interface AnimatedCounterOptions {
  duration?: number;
  enabled?: boolean;
}

export function useAnimatedCounter(target: number, { duration = 700, enabled = true }: AnimatedCounterOptions = {}) {
  const [value, setValue] = useState(enabled ? 0 : target);
  const frameRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled || startedRef.current) {
      setValue(target);
      return undefined;
    }

    startedRef.current = true;
    const start = performance.now();
    const from = 0;
    const to = target;

    const tick = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (to - from) * eased));

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(tick);
      }
    };

    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [duration, enabled, target]);

  return value;
}

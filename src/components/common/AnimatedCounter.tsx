import { useEffect, useRef, useState } from "react";

import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { formatCompactNumber } from "@/lib/numberFormatter";

interface AnimatedCounterProps {
  value: number;
  formatter?: (value: number) => string;
}

export function AnimatedCounter({ formatter = formatCompactNumber, value }: AnimatedCounterProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const animatedValue = useAnimatedCounter(value, { enabled: visible });

  useEffect(() => {
    const element = ref.current;
    if (!element || visible) return undefined;

    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <span ref={ref} aria-label={formatter(value)}>
      {formatter(animatedValue)}
    </span>
  );
}

import type { Transition, Variants } from "framer-motion";

export const motionTiming = {
  fast: 0.12,
  base: 0.18,
  slow: 0.26,
  ease: [0.2, 0, 0, 1] as const,
} satisfies Record<string, unknown>;

export const pageTransition: Transition = {
  duration: motionTiming.base,
  ease: motionTiming.ease,
};

export const reducedMotionTransition: Transition = {
  duration: 0,
};

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export const dialogOverlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const dialogPanelVariants: Variants = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.98 },
};

export const popoverVariants: Variants = {
  initial: { opacity: 0, y: -4, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.98 },
};

export function drawerVariants(side: "left" | "right"): Variants {
  const hiddenX = side === "left" ? "-100%" : "100%";

  return {
    initial: { x: hiddenX },
    animate: { x: 0 },
    exit: { x: hiddenX },
  };
}

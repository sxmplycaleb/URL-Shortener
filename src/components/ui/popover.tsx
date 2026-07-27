import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { pageTransition, popoverVariants, reducedMotionTransition } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface PopoverProps {
  open: boolean;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Popover({
  open,
  trigger,
  children,
  align = "left",
  className,
  disabled = false,
  loading = false,
  onOpenChange,
}: PopoverProps) {
  const popoverId = React.useId();
  const ref = React.useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onOpenChange, open]);

  const triggerNode = React.isValidElement<{
    "aria-controls"?: string | undefined;
    "aria-expanded"?: boolean | undefined;
    disabled?: boolean | undefined;
    onClick?: React.MouseEventHandler | undefined;
  }>(trigger)
    ? React.cloneElement(trigger, {
        "aria-controls": popoverId,
        "aria-expanded": open,
        disabled: disabled || trigger.props.disabled || undefined,
        onClick: (event) => {
          trigger.props.onClick?.(event);
          if (!event.defaultPrevented && !disabled) {
            onOpenChange(!open);
          }
        },
      })
    : trigger;

  return (
    <div ref={ref} className="relative inline-block">
      {triggerNode}
      <AnimatePresence>
        {open ? (
          <motion.div
            id={popoverId}
            role="dialog"
            aria-busy={loading || undefined}
            className={cn(
              "absolute top-full z-dropdown mt-2 w-72 origin-top rounded-md border bg-popover p-3 text-popover-foreground shadow-panel transition-[border-color,box-shadow] duration-base ease-standard focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
              align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left",
              loading ? "animate-pulse" : "",
              className,
            )}
            initial={reduceMotion ? false : "initial"}
            animate="animate"
            exit={reduceMotion ? {} : "exit"}
            variants={popoverVariants}
            transition={reduceMotion ? reducedMotionTransition : pageTransition}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

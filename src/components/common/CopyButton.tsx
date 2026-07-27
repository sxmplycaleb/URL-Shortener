import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Copy, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { pageTransition, reducedMotionTransition } from "@/lib/motion";

interface CopyButtonProps {
  value: string;
  label?: string;
}

export function CopyButton({ value, label = "Copy link" }: CopyButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const resetTimer = useRef<number | undefined>(undefined);
  const reduceMotion = useReducedMotion();

  async function copyValue() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        fallbackCopy(value);
      }
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    window.clearTimeout(resetTimer.current);
    if (status === "idle") return undefined;
    resetTimer.current = window.setTimeout(() => setStatus("idle"), 1600);
    return () => window.clearTimeout(resetTimer.current);
  }, [status]);

  const statusLabel = status === "copied" ? "Copied" : status === "error" ? "Copy failed" : label;

  return (
    <Tooltip label={statusLabel}>
      <Button aria-label={statusLabel} size="icon" variant="ghost" onClick={copyValue}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={status}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? {} : { opacity: 0, scale: 0.8 }}
            transition={reduceMotion ? reducedMotionTransition : pageTransition}
          >
            {status === "copied" ? <Check className="h-4 w-4 text-success" /> : null}
            {status === "error" ? <TriangleAlert className="h-4 w-4 text-destructive" /> : null}
            {status === "idle" ? <Copy className="h-4 w-4" /> : null}
          </motion.span>
        </AnimatePresence>
      </Button>
    </Tooltip>
  );
}

function fallbackCopy(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) {
    throw new Error("Unable to copy value.");
  }
}

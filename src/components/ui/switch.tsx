import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked: boolean;
  loading?: boolean;
}

export function Switch({ checked, className, disabled, loading = false, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(
        "inline-flex h-7 w-12 items-center rounded-full border border-input transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "bg-primary" : "bg-muted",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "grid h-5 w-5 place-items-center rounded-full bg-background text-primary shadow-xs transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
      </span>
    </button>
  );
}

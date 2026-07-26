import * as React from "react";
import { Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  loading?: boolean;
};

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked, className, disabled, loading = false, ...props }, ref) => (
    <span className="relative inline-grid h-5 w-5 place-items-center">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          "peer h-5 w-5 appearance-none rounded-sm border border-input bg-background shadow-xs transition-colors checked:border-primary checked:bg-primary hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
          className,
        )}
        {...props}
      />
      {loading ? (
        <Loader2 className="pointer-events-none absolute h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
      ) : (
        <Check className="pointer-events-none absolute h-3.5 w-3.5 text-primary-foreground opacity-0 transition-opacity peer-checked:opacity-100" aria-hidden="true" />
      )}
    </span>
  ),
);

Checkbox.displayName = "Checkbox";

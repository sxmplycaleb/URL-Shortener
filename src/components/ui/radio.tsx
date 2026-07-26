import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type RadioProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  loading?: boolean;
};

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, disabled, loading = false, ...props }, ref) => (
    <span className="relative inline-grid h-5 w-5 place-items-center">
      <input
        ref={ref}
        type="radio"
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          "peer h-5 w-5 appearance-none rounded-full border border-input bg-background shadow-xs transition-colors checked:border-primary hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
          className,
        )}
        {...props}
      />
      {loading ? (
        <Loader2 className="pointer-events-none absolute h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
      ) : (
        <span className="pointer-events-none absolute h-2.5 w-2.5 rounded-full bg-primary opacity-0 transition-opacity peer-checked:opacity-100" />
      )}
    </span>
  ),
);

Radio.displayName = "Radio";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  loading?: boolean;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, disabled, loading = false, ...props }, ref) => {
    const textarea = (
      <textarea
        ref={ref}
        className={cn(
          "min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-[border-color,background-color,box-shadow,opacity] duration-base ease-standard placeholder:text-muted-foreground hover:border-primary/60 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive disabled:cursor-not-allowed disabled:bg-muted/70 disabled:opacity-60",
          loading ? "pr-10" : "",
          className,
        )}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      />
    );

    if (!loading) return textarea;

    return (
      <span className="relative block">
        {textarea}
        <Loader2 className="pointer-events-none absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
      </span>
    );
  },
);

Textarea.displayName = "Textarea";

import * as React from "react";
import { ChevronDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type DropdownProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  loading?: boolean;
};

export const Dropdown = React.forwardRef<HTMLSelectElement, DropdownProps>(
  ({ children, className, disabled, loading = false, ...props }, ref) => (
    <span className="relative block">
      <select
        ref={ref}
        className={cn(
          "min-h-11 w-full appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-10 text-sm text-foreground shadow-xs transition-[border-color,background-color,box-shadow,opacity] duration-base ease-standard hover:border-primary/60 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive disabled:cursor-not-allowed disabled:bg-muted/70 disabled:opacity-60",
          className,
        )}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {children}
      </select>
      {loading ? (
        <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" />
      ) : (
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      )}
    </span>
  ),
);

Dropdown.displayName = "Dropdown";

import * as React from "react";
import type { VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/buttonVariants";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingLabel?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, disabled, loading = false, loadingLabel = "Loading", type = "button", variant, size, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {loading ? <span className="sr-only">{loadingLabel}</span> : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

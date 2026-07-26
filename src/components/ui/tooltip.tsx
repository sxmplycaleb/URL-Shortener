import * as React from "react";

import { cn } from "@/lib/utils";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({
  label,
  children,
  disabled = false,
  loading = false,
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
}) {
  const tooltipId = React.useId();
  const trigger = React.isValidElement<{ "aria-describedby"?: string | undefined; "aria-busy"?: boolean | undefined; "aria-disabled"?: boolean | undefined }>(children)
    ? React.cloneElement(children, {
        "aria-busy": loading || children.props["aria-busy"] || undefined,
        "aria-describedby": disabled ? children.props["aria-describedby"] : [children.props["aria-describedby"], tooltipId].filter(Boolean).join(" ") || tooltipId,
        "aria-disabled": disabled || children.props["aria-disabled"] || undefined,
      })
    : children;

  return (
    <span className="group relative inline-flex">
      {trigger}
      {disabled ? null : (
        <span
          id={tooltipId}
          role="tooltip"
          aria-busy={loading || undefined}
          className={cn(
            "pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden max-w-xs -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-soft",
            "group-hover:block group-focus-within:block",
            loading ? "animate-pulse" : "",
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}

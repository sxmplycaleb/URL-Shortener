import * as React from "react";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const tooltipId = React.useId();

  return (
    <span className="group relative inline-flex">
      {children}
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-soft group-hover:block group-focus-within:block"
      >
        {label}
      </span>
    </span>
  );
}

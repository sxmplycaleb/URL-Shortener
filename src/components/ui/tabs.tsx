import * as React from "react";

import { cn } from "@/lib/utils";

export function Tabs({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("w-full", className)} {...props} />;
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex min-h-11 items-center rounded-md border bg-muted p-1 text-muted-foreground", className)}
      {...props}
    />
  );
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  loading?: boolean;
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ active = false, className, disabled, loading = false, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={active}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(
        "inline-flex min-h-9 items-center justify-center rounded-sm px-3 text-sm font-medium transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60",
        active ? "bg-background text-foreground shadow-xs" : "",
        loading ? "animate-pulse" : "",
        className,
      )}
      {...props}
    />
  ),
);

TabsTrigger.displayName = "TabsTrigger";

export function TabsContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tabpanel"
      className={cn("mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background", className)}
      {...props}
    />
  );
}

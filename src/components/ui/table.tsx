import * as React from "react";

import { cn } from "@/lib/utils";

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  disabled?: boolean;
  loading?: boolean;
}

export function Table({ className, disabled = false, loading = false, ...props }: TableProps) {
  return (
    <div
      className={cn("w-full overflow-x-auto rounded-lg border bg-card shadow-xs", disabled ? "opacity-60" : "", loading ? "animate-pulse" : "")}
      aria-disabled={disabled || undefined}
      aria-busy={loading || undefined}
    >
      <table className={cn("w-full table-fixed caption-bottom text-sm text-card-foreground", className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn("h-12 border-b bg-muted/60 px-4 text-left align-middle font-semibold text-muted-foreground transition-colors duration-base ease-standard", className)}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b border-border/70 p-4 align-middle transition-colors", className)} {...props} />;
}

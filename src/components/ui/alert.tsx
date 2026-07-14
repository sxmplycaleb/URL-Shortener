import * as React from "react";

import { cn } from "@/lib/utils";

export function Alert({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="alert"
      className={cn("rounded-md border border-warning/30 bg-warning/10 p-4 text-sm text-foreground", className)}
      {...props}
    />
  );
}

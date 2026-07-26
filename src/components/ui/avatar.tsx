import * as React from "react";
import { Loader2, User } from "lucide-react";

import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string | undefined;
  alt?: string | undefined;
  fallback?: string | undefined;
  disabled?: boolean;
  loading?: boolean;
}

export function Avatar({ src, alt = "", fallback, disabled = false, loading = false, className, ...props }: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md border bg-accent text-sm font-bold text-accent-foreground shadow-xs transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-disabled:opacity-60",
        className,
      )}
      aria-disabled={disabled || undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {!loading && src ? <img className="h-full w-full object-cover" src={src} alt={alt} /> : null}
      {!loading && !src && fallback ? fallback : null}
      {!loading && !src && !fallback ? <User className="h-4 w-4" aria-hidden="true" /> : null}
    </span>
  );
}

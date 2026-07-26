import * as React from "react";
import { ChevronRight, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function Breadcrumbs({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <nav aria-label="Breadcrumb" className={className} {...props} />;
}

export function BreadcrumbList({ className, ...props }: React.OlHTMLAttributes<HTMLOListElement>) {
  return <ol className={cn("flex flex-wrap items-center gap-1 text-sm text-muted-foreground", className)} {...props} />;
}

export function BreadcrumbItem({ className, ...props }: React.LiHTMLAttributes<HTMLLIElement>) {
  return <li className={cn("inline-flex items-center gap-1", className)} {...props} />;
}

export function BreadcrumbSeparator({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span aria-hidden="true" className={cn("text-muted-foreground/70", className)} {...props}>
      <ChevronRight className="h-4 w-4" />
    </span>
  );
}

interface BreadcrumbLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  current?: boolean;
  loading?: boolean;
}

export const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({ children, className, current = false, loading = false, ...props }, ref) => (
    <a
      ref={ref}
      aria-current={current ? "page" : undefined}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex min-h-8 items-center rounded-sm px-1 font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-disabled:pointer-events-none aria-disabled:opacity-60",
        current ? "text-foreground" : "",
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
      {children}
    </a>
  ),
);

BreadcrumbLink.displayName = "BreadcrumbLink";

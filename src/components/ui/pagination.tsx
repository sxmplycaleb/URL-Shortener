import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Pagination({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <nav aria-label="Pagination" className={cn("flex items-center justify-center gap-2", className)} {...props} />;
}

export function PaginationList({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("flex items-center gap-1", className)} {...props} />;
}

export function PaginationItem({ className, ...props }: React.LiHTMLAttributes<HTMLLIElement>) {
  return <li className={className} {...props} />;
}

interface PaginationButtonProps extends ButtonProps {
  current?: boolean;
}

export const PaginationButton = React.forwardRef<HTMLButtonElement, PaginationButtonProps>(
  ({ current = false, variant, className, ...props }, ref) => (
    <Button
      ref={ref}
      size="icon"
      variant={current ? "default" : variant ?? "ghost"}
      aria-current={current ? "page" : undefined}
      className={cn("h-10 w-10", className)}
      {...props}
    />
  ),
);

PaginationButton.displayName = "PaginationButton";

export function PaginationPrevious(props: Omit<PaginationButtonProps, "children">) {
  return (
    <PaginationButton aria-label="Go to previous page" {...props}>
      {props.loading ? <span className="sr-only">Loading previous page</span> : <ChevronLeft className="h-4 w-4" aria-hidden="true" />}
    </PaginationButton>
  );
}

export function PaginationNext(props: Omit<PaginationButtonProps, "children">) {
  return (
    <PaginationButton aria-label="Go to next page" {...props}>
      {props.loading ? <span className="sr-only">Loading next page</span> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
    </PaginationButton>
  );
}

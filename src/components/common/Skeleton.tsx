import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} aria-hidden="true" />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-label="Loading dashboard">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-40" />
          <Skeleton className="h-11 w-28" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-52" />
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <Skeleton className="h-11" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <span className="sr-only">Loading dashboard</span>
    </div>
  );
}

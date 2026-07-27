import { CircleAlert } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { formatNumber } from "@/lib/utils";
import type { BreakdownAnalyticsItem } from "@/services/analyticsService";

export function BreakdownList({
  emptyTitle,
  items,
}: {
  emptyTitle: string;
  items: BreakdownAnalyticsItem[];
}) {
  if (!items.length) {
    return <EmptyState description="Breakdowns appear after your short URLs receive traffic." icon={CircleAlert} title={emptyTitle} />;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div className="rounded-md border p-3 transition-colors hover:bg-muted/40" key={item.name}>
          <div className="mb-2 flex items-start justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium">{item.name}</span>
            <span className="shrink-0 text-right font-mono text-muted-foreground">
              {formatNumber(item.clicks)} clicks
              <span className="ml-2 font-semibold text-foreground">{item.share}%</span>
            </span>
          </div>
          <div
            aria-label={`${item.name}: ${item.share}%`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={item.share}
            className="h-2.5 rounded-full bg-muted"
            role="progressbar"
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${item.share}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

import { CircleAlert } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { formatNumber } from "@/lib/utils";
import type { BrowserAnalyticsItem } from "@/services/analyticsService";

export function BrowserAnalytics({ items }: { items: BrowserAnalyticsItem[] }) {
  if (!items.length) {
    return (
      <EmptyState
        description="Browser breakdown appears after your short URLs receive visits."
        icon={CircleAlert}
        title="No browser data yet"
      />
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.name}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span>{item.name}</span>
            <span className="font-mono text-muted-foreground">
              {formatNumber(item.clicks)} clicks - {item.share}%
            </span>
          </div>
          <div
            aria-label={`${item.name}: ${item.share}%`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={item.share}
            className="h-2 rounded-full bg-muted"
            role="progressbar"
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${item.share}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

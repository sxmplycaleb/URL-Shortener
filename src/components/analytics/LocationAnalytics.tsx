import { MapPin } from "lucide-react";

import { formatNumber } from "@/lib/utils";
import type { LocationAnalyticsItem } from "@/services/analyticsService";

export function LocationAnalytics({ items }: { items: LocationAnalyticsItem[] }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div className="rounded-md border p-3 transition-colors hover:bg-muted/40" key={`${item.place}-${item.country}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="truncate">{item.place}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{item.country}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-sm font-semibold">{formatNumber(item.clicks)}</p>
              <p className="text-xs text-muted-foreground">{item.share}%</p>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted">
            <div className="h-full rounded-full bg-accent" style={{ width: `${item.share}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

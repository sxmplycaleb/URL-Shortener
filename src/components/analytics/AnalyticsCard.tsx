import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Link2, MousePointerClick, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AnalyticsSummaryCard, AnalyticsSummaryIcon } from "@/services/analyticsService";

const iconMap: Record<AnalyticsSummaryIcon, typeof MousePointerClick> = {
  clicks: MousePointerClick,
  links: Link2,
  active: Activity,
  growth: TrendingUp,
};

export function AnalyticsCard({ item }: { item: AnalyticsSummaryCard }) {
  const TrendIcon =
    item.trendDirection === "up" ? ArrowUpRight : item.trendDirection === "down" ? ArrowDownRight : ArrowRight;
  const Icon = iconMap[item.icon];

  return (
    <Card className="p-5 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{item.title}</p>
          <p className="mt-2 text-2xl font-bold">{item.value}</p>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <div
        className={cn(
          "mt-4 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
          item.trendDirection === "up" && "bg-success/10 text-success",
          item.trendDirection === "down" && "bg-destructive/10 text-destructive",
          item.trendDirection === "neutral" && "bg-muted text-muted-foreground",
        )}
      >
        <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
        {item.trend}
      </div>
    </Card>
  );
}

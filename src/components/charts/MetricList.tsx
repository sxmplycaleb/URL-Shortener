import type { BreakdownItem } from "@/types/link";

export function MetricList({ items }: { items: BreakdownItem[] }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.name}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span>{item.name}</span>
            <span className="font-mono text-muted-foreground">{item.value}%</span>
          </div>
          <div
            aria-label={`${item.name}: ${item.value}%`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={item.value}
            className="h-2 rounded-full bg-muted"
            role="progressbar"
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${item.value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

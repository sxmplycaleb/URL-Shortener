import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ClickActivityPoint } from "@/services/analyticsService";

export function ClickChart({ data }: { data: ClickActivityPoint[] }) {
  const gradientId = `analytics-clicks-${useId().replace(/:/g, "")}`;

  return (
    <figure className="h-80 w-full" aria-label="Click activity line chart">
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart accessibilityLayer data={data} margin={{ bottom: 4, left: -14, right: 10, top: 12 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" minTickGap={18} stroke="hsl(var(--muted-foreground))" tickLine={false} />
          <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} width={48} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              color: "hsl(var(--card-foreground))",
            }}
            formatter={(value) => [new Intl.NumberFormat("en").format(Number(value)), "Clicks"]}
          />
          <Area
            dataKey="clicks"
            fill={`url(#${gradientId})`}
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
      <figcaption className="sr-only">
        {data.map((point) => `${point.label}: ${point.clicks} clicks`).join(", ")}
      </figcaption>
    </figure>
  );
}

import { useId } from "react";
import { ResponsiveContainer, Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import type { ChartPoint } from "@/types/link";

export function ClicksChart({ data }: { data: ChartPoint[] }) {
  const gradientId = `click-fill-${useId().replace(/:/g, "")}`;

  return (
    <figure className="h-72 w-full" aria-label="Daily clicks area chart">
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart accessibilityLayer data={data} margin={{ left: -18, right: 8, top: 12 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tickLine={false} />
          <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} />
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
          <Area dataKey="clicks" fill={`url(#${gradientId})`} stroke="hsl(var(--primary))" strokeWidth={2} type="monotone" />
        </AreaChart>
      </ResponsiveContainer>
      <figcaption className="sr-only">
        {data.map((point) => `${point.label}: ${point.clicks} clicks`).join(", ")}
      </figcaption>
    </figure>
  );
}

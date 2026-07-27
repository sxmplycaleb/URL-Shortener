import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ClickActivityPoint } from "@/services/analyticsService";

export function ClickChart({ data, label = "Click activity line chart" }: { data: ClickActivityPoint[]; label?: string }) {
  const gradientId = `analytics-clicks-${useId().replace(/:/g, "")}`;

  return (
    <figure className="h-72 w-full sm:h-80" aria-label={label}>
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart accessibilityLayer data={data} margin={{ bottom: 12, left: -6, right: 12, top: 12 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            minTickGap={18}
            stroke="hsl(var(--muted-foreground))"
            tickLine={false}
            tickMargin={10}
          />
          <YAxis
            axisLine={false}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(value) => new Intl.NumberFormat("en", { notation: "compact" }).format(Number(value))}
            tickLine={false}
            width={54}
          />
          <Tooltip
            cursor={{ stroke: "hsl(var(--primary))", strokeDasharray: "4 4" }}
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
            activeDot={{ r: 5, stroke: "hsl(var(--card))", strokeWidth: 2 }}
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

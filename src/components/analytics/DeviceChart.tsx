import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { DeviceAnalyticsItem } from "@/services/analyticsService";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))"];

export function DeviceChart({ data }: { data: DeviceAnalyticsItem[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_150px] sm:items-center">
      <figure className="h-56 w-full" aria-label="Device analytics doughnut chart">
        <ResponsiveContainer height="100%" width="100%">
          <PieChart accessibilityLayer>
            <Pie data={data} dataKey="value" innerRadius={56} outerRadius={88} paddingAngle={4}>
              {data.map((item, index) => (
                <Cell key={item.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--card-foreground))",
              }}
              formatter={(value) => [`${value}%`, "Share"]}
            />
          </PieChart>
        </ResponsiveContainer>
      </figure>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div className="flex items-center justify-between gap-3 text-sm" key={item.name}>
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
              {item.name}
            </span>
            <span className="font-mono text-muted-foreground">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

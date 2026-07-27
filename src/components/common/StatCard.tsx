import type { LucideIcon } from "lucide-react";

import { AnimatedCounter } from "@/components/common/AnimatedCounter";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  detail: string;
  meta?: string;
  tone?: "primary" | "success" | "warning" | "info" | "muted";
}

const toneClasses = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  muted: "bg-muted text-muted-foreground",
};

export function StatCard({ icon: Icon, label, value, detail, meta, tone = "primary" }: StatCardProps) {
  return (
    <Card className="group p-5 transition-all duration-base hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold">
            {typeof value === "number" ? <AnimatedCounter value={value} /> : value}
          </p>
        </div>
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-md transition-transform duration-base group-hover:scale-105 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-4 flex min-h-5 flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{detail}</span>
        {meta ? <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">{meta}</span> : null}
      </div>
    </Card>
  );
}

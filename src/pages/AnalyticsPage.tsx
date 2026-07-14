import { BarChart3, Globe2, MonitorSmartphone, MousePointerClick } from "lucide-react";

import { ClicksChart } from "@/components/charts/ClicksChart";
import { MetricList } from "@/components/charts/MetricList";
import { EmptyState } from "@/components/common/EmptyState";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { browsers, clickTimeline, countries, devices, referrers } from "@/services/mockData";

export function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="mt-1 text-muted-foreground">Click performance and audience breakdown for your links.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard detail="Last 7 days" icon={MousePointerClick} label="Clicks" value="6,060" />
        <StatCard detail="Top country: United States" icon={Globe2} label="Countries" value="42" />
        <StatCard detail="Mobile leads this week" icon={MonitorSmartphone} label="Device mix" value="58%" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clicks timeline</CardTitle>
          <CardDescription>Daily click volume for the selected reporting period.</CardDescription>
        </CardHeader>
        <CardContent>
          <ClicksChart data={clickTimeline} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Countries</CardTitle>
            <CardDescription>Approximate country share.</CardDescription>
          </CardHeader>
          <CardContent>
            <MetricList items={countries} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Devices</CardTitle>
            <CardDescription>Traffic by device category.</CardDescription>
          </CardHeader>
          <CardContent>
            <MetricList items={devices} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Browsers</CardTitle>
            <CardDescription>Top browser families.</CardDescription>
          </CardHeader>
          <CardContent>
            <MetricList items={browsers} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Referrers</CardTitle>
            <CardDescription>Where clicks originate.</CardDescription>
          </CardHeader>
          <CardContent>
            <MetricList items={referrers} />
          </CardContent>
        </Card>
      </div>

      <EmptyState
        description="When a link has not received traffic yet, analytics panels collapse into this state with a clear next action."
        icon={BarChart3}
        title="No analytics state"
      />
    </div>
  );
}

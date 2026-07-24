import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { CircleAlert, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { AnalyticsTable } from "@/components/analytics/AnalyticsTable";
import { BreakdownList } from "@/components/analytics/BreakdownList";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAnalyticsDashboard,
  getAnalyticsExportUrl,
  type AnalyticsDashboardData,
  type AnalyticsPeriod,
  type ActivityPeriod,
} from "@/services/analyticsService";
import { authenticatedDownload, getApiErrorMessage, isAuthorizationError } from "@/services/api";
import { clearAuthSession, getAuthSession } from "@/services/authStorage";

const periods: Array<{ label: string; value: AnalyticsPeriod }> = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
];

const activityPeriods: Array<{ label: string; value: ActivityPeriod }> = [
  { label: "Hourly", value: "hourly" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

const BrowserAnalytics = lazy(() =>
  import("@/components/analytics/BrowserAnalytics").then((module) => ({ default: module.BrowserAnalytics })),
);
const ClickChart = lazy(() =>
  import("@/components/analytics/ClickChart").then((module) => ({ default: module.ClickChart })),
);
const DeviceChart = lazy(() =>
  import("@/components/analytics/DeviceChart").then((module) => ({ default: module.DeviceChart })),
);
const LocationAnalytics = lazy(() =>
  import("@/components/analytics/LocationAnalytics").then((module) => ({ default: module.LocationAnalytics })),
);

function ChartFallback({ label }: { label: string }) {
  return (
    <div className="grid min-h-56 place-items-center">
      <LoadingState label={label} />
    </div>
  );
}

export function AnalyticsPage() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const accessToken = session?.accessToken ?? "";
  const [period, setPeriod] = useState<AnalyticsPeriod>("7d");
  const [activityPeriod, setActivityPeriod] = useState<ActivityPeriod>("daily");
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");

  const endSession = useCallback(() => {
    const message = "Your session expired. Please log in again.";
    clearAuthSession(message);
    navigate("/login", { replace: true, state: { message } });
  }, [navigate]);

  useEffect(() => {
    let active = true;

    async function loadAnalytics() {
      if (!accessToken) {
        endSession();
        return;
      }

      try {
        const response = await getAnalyticsDashboard(accessToken);
        if (active) {
          setData(response);
          setError("");
        }
      } catch (loadError) {
        if (isAuthorizationError(loadError)) {
          endSession();
          return;
        }

        if (active) {
          setError(getApiErrorMessage(loadError, "Unable to load analytics right now. Please try again."));
        }
      }
    }

    void loadAnalytics();

    return () => {
      active = false;
    };
  }, [accessToken, endSession]);

  const clickActivity = useMemo(() => data?.clickActivity[period] ?? [], [data, period]);
  const activity = useMemo(() => data?.activity?.[activityPeriod] ?? [], [activityPeriod, data]);

  async function exportAnalytics(format: "csv" | "excel" | "json") {
    if (!accessToken || exporting) return;

    setExporting(format);
    try {
      const blob = await authenticatedDownload(getAnalyticsExportUrl(format), accessToken);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `shortly-analytics.${format === "excel" ? "xls" : format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(getApiErrorMessage(exportError, "Unable to export analytics right now."));
    } finally {
      setExporting("");
    }
  }

  if (!data && !error) {
    return <LoadingState label="Loading analytics" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="mt-1 text-muted-foreground">Track clicks, link health, devices, and top audience locations.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["csv", "excel", "json"] as const).map((format) => (
            <Button disabled={Boolean(exporting)} key={format} variant="outline" onClick={() => void exportAnalytics(format)}>
              <Download className="h-4 w-4" />
              {format.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {error ? <Alert>{error}</Alert> : null}
      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.summary.map((item) => (
              <AnalyticsCard item={item} key={item.id} />
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {data.insights.map((insight) => (
              <Card key={insight.id}>
                <CardHeader className="space-y-1">
                  <CardDescription>{insight.title}</CardDescription>
                  <CardTitle className="break-all text-lg">{insight.value}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{insight.detail}</CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Click activity</CardTitle>
                <CardDescription>Clicks over time for the selected reporting period.</CardDescription>
              </div>
              <div className="inline-flex rounded-md border bg-card p-1" aria-label="Analytics reporting period">
                {periods.map((item) => (
                  <Button
                    className="h-9 px-3"
                    key={item.value}
                    variant={period === item.value ? "default" : "ghost"}
                    onClick={() => setPeriod(item.value)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {clickActivity.some((point) => point.clicks > 0) ? (
                <Suspense fallback={<ChartFallback label="Loading chart" />}>
                  <ClickChart data={clickActivity} />
                </Suspense>
              ) : (
                <EmptyState description="Clicks will appear here after someone opens one of your short URLs." icon={CircleAlert} title="No clicks yet" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Activity cadence</CardTitle>
                <CardDescription>Hourly, daily, weekly, and monthly click rhythm.</CardDescription>
              </div>
              <div className="inline-flex flex-wrap rounded-md border bg-card p-1" aria-label="Activity cadence period">
                {activityPeriods.map((item) => (
                  <Button
                    className="h-9 px-3"
                    key={item.value}
                    variant={activityPeriod === item.value ? "default" : "ghost"}
                    onClick={() => setActivityPeriod(item.value)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<ChartFallback label="Loading activity chart" />}>
                <ClickChart data={activity} label="Activity cadence line chart" />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Link performance</CardTitle>
              <CardDescription>Per-link analytics for your shortened URLs.</CardDescription>
            </CardHeader>
            <CardContent>
              <AnalyticsTable links={data.links} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top performing URLs</CardTitle>
              <CardDescription>Highest-clicked links across your workspace.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {data.topUrls.map((url, index) => (
                <div className="flex items-start justify-between gap-3 rounded-md border p-3" key={url.id}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="muted">#{index + 1}</Badge>
                      <p className="truncate font-medium">{url.title}</p>
                    </div>
                    <p className="mt-1 break-all font-mono text-xs text-primary">{url.shortUrl}</p>
                  </div>
                  <p className="shrink-0 font-mono text-sm">{url.totalClicks.toLocaleString("en")}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Device analytics</CardTitle>
                <CardDescription>Share of clicks by device type.</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<ChartFallback label="Loading device analytics" />}>
                  <DeviceChart data={data.devices} />
                </Suspense>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Browser analytics</CardTitle>
                <CardDescription>Top browsers opening your short URLs.</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<ChartFallback label="Loading browser analytics" />}>
                  <BrowserAnalytics items={data.browsers} />
                </Suspense>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Location analytics</CardTitle>
                <CardDescription>Top cities and countries generating clicks.</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<ChartFallback label="Loading location analytics" />}>
                  <LocationAnalytics items={data.locations} />
                </Suspense>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Operating systems</CardTitle>
                <CardDescription>Top operating systems by click share.</CardDescription>
              </CardHeader>
              <CardContent>
                <BreakdownList emptyTitle="No operating system data yet" items={data.operatingSystems} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Referrers</CardTitle>
                <CardDescription>Sources sending traffic to your short links.</CardDescription>
              </CardHeader>
              <CardContent>
                <BreakdownList emptyTitle="No referrer data yet" items={data.referrers} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Countries</CardTitle>
                <CardDescription>Country-level click distribution.</CardDescription>
              </CardHeader>
              <CardContent>
                <BreakdownList emptyTitle="No country data yet" items={data.countries} />
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

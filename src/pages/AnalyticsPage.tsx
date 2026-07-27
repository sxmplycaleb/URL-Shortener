import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CircleAlert, Download, FileText, Filter, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { AnalyticsTable } from "@/components/analytics/AnalyticsTable";
import { BreakdownList } from "@/components/analytics/BreakdownList";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/common/Skeleton";
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

const dateRangeOptions: Array<{ label: string; value: AnalyticsPeriod | "today" | "90d" | "custom"; disabled?: boolean }> = [
  { label: "Today", value: "today", disabled: true },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d", disabled: true },
  { label: "Custom range", value: "custom", disabled: true },
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
    <div className="space-y-4" role="status" aria-live="polite" aria-label={label}>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-64 w-full" />
      <div className="flex justify-between gap-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-label="Loading analytics">
      <div className="rounded-lg border bg-card p-6 shadow-xs">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-52" />
            <Skeleton className="h-5 w-80 max-w-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-11 w-24" />
            <Skeleton className="h-11 w-24" />
            <Skeleton className="h-11 w-24" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <Skeleton className="h-96" />
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      <span className="sr-only">Loading analytics</span>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <CardTitle>{title}</CardTitle>
      <CardDescription className="mt-1">{description}</CardDescription>
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
    return <AnalyticsSkeleton />;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-lg border bg-card p-5 shadow-xs sm:p-6" aria-labelledby="analytics-heading">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <Badge variant="muted">Phase 7 workspace</Badge>
            <h1 id="analytics-heading" className="mt-3 text-3xl font-bold">
              Analytics
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Track clicks, link health, audience context, and top-performing URLs from one focused reporting workspace.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap xl:justify-end">
            <Button
              aria-label="PDF export is not available in this analytics service yet"
              className="justify-start sm:justify-center"
              disabled
              variant="outline"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              PDF
            </Button>
            <Button
              aria-label="Share analytics is not available in this analytics service yet"
              className="justify-start sm:justify-center"
              disabled
              variant="outline"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Share
            </Button>
            {(["csv", "excel", "json"] as const).map((format) => (
              <Button
                aria-label={`Export analytics as ${format.toUpperCase()}`}
                className="justify-start sm:justify-center"
                disabled={Boolean(exporting)}
                key={format}
                loading={exporting === format}
                loadingLabel={`Exporting ${format.toUpperCase()}`}
                variant="outline"
                onClick={() => void exportAnalytics(format)}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {format.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t pt-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
            Reporting range
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Analytics date range">
            {dateRangeOptions.map((item) => (
              <Button
                aria-disabled={item.disabled || undefined}
                aria-pressed={period === item.value}
                className="h-10 min-h-10 shrink-0 px-3"
                disabled={item.disabled}
                key={item.value}
                variant={period === item.value ? "default" : "ghost"}
                onClick={() => {
                  if (!item.disabled && (item.value === "7d" || item.value === "30d")) {
                    setPeriod(item.value);
                  }
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {error ? <Alert>{error}</Alert> : null}
      {data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Analytics KPI summary">
            {data.summary.map((item) => (
              <AnalyticsCard item={item} key={item.id} />
            ))}
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" aria-label="Analytics insight summary">
            {data.insights.map((insight) => (
              <Card className="p-5" key={insight.id}>
                <CardHeader className="space-y-1 p-0">
                  <CardDescription>{insight.title}</CardDescription>
                  <CardTitle className="break-all text-lg">{insight.value}</CardTitle>
                </CardHeader>
                <CardContent className="mt-4 p-0 text-sm text-muted-foreground">{insight.detail}</CardContent>
              </Card>
            ))}
          </section>

          <Card>
            <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
              <SectionHeader title="Click activity" description="Clicks over time for the selected reporting period." />
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
              <SectionHeader title="Activity cadence" description="Hourly, daily, weekly, and monthly click rhythm." />
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <SectionHeader title="Link performance" description="Per-link analytics for your shortened URLs." />
                <Badge className="w-fit" variant="muted">
                  <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                  {data.links.length.toLocaleString("en")} results
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <AnalyticsTable links={data.links} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader title="Top performing URLs" description="Highest-clicked links across your workspace." />
            </CardHeader>
            <CardContent className="grid gap-3">
              {data.topUrls.length ? (
                data.topUrls.map((url, index) => (
                  <div className="flex items-start justify-between gap-3 rounded-md border p-4 transition-colors hover:bg-muted/40" key={url.id}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="muted">#{index + 1}</Badge>
                        <p className="truncate font-medium">{url.title}</p>
                      </div>
                      <p className="mt-2 break-all font-mono text-xs text-primary">{url.shortUrl}</p>
                    </div>
                    <p className="shrink-0 rounded-md bg-muted px-3 py-2 font-mono text-sm font-semibold">
                      {url.totalClicks.toLocaleString("en")}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  description="Your most-clicked URLs will be ranked here once link traffic starts coming in."
                  icon={CircleAlert}
                  title="No top URLs yet"
                />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <SectionHeader title="Device analytics" description="Share of clicks by device type." />
              </CardHeader>
              <CardContent>
                <Suspense fallback={<ChartFallback label="Loading device analytics" />}>
                  <DeviceChart data={data.devices} />
                </Suspense>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <SectionHeader title="Browser analytics" description="Top browsers opening your short URLs." />
              </CardHeader>
              <CardContent>
                <Suspense fallback={<ChartFallback label="Loading browser analytics" />}>
                  <BrowserAnalytics items={data.browsers} />
                </Suspense>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <SectionHeader title="Location analytics" description="Top cities and countries generating clicks." />
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
                <SectionHeader title="Operating systems" description="Top operating systems by click share." />
              </CardHeader>
              <CardContent>
                <BreakdownList emptyTitle="No operating system data yet" items={data.operatingSystems} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <SectionHeader title="Referrers" description="Sources sending traffic to your short links." />
              </CardHeader>
              <CardContent>
                <BreakdownList emptyTitle="No referrer data yet" items={data.referrers} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <SectionHeader title="Countries" description="Country-level click distribution." />
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

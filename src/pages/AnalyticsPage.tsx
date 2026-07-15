import { useCallback, useEffect, useMemo, useState } from "react";
import { CircleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { AnalyticsTable } from "@/components/analytics/AnalyticsTable";
import { BrowserAnalytics } from "@/components/analytics/BrowserAnalytics";
import { ClickChart } from "@/components/analytics/ClickChart";
import { DeviceChart } from "@/components/analytics/DeviceChart";
import { LocationAnalytics } from "@/components/analytics/LocationAnalytics";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAnalyticsDashboard,
  type AnalyticsDashboardData,
  type AnalyticsPeriod,
} from "@/services/analyticsService";
import { ApiError } from "@/services/api";
import { clearAuthSession, getAuthSession } from "@/services/authStorage";

const periods: Array<{ label: string; value: AnalyticsPeriod }> = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
];

export function AnalyticsPage() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const accessToken = session?.accessToken ?? "";
  const [period, setPeriod] = useState<AnalyticsPeriod>("7d");
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [error, setError] = useState("");

  const endSession = useCallback(() => {
    clearAuthSession();
    navigate("/login", { replace: true, state: { message: "Your session expired. Please log in again." } });
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
        if (loadError instanceof ApiError && (loadError.status === 401 || loadError.status === 403)) {
          endSession();
          return;
        }

        if (active) {
          setError(loadError instanceof ApiError ? loadError.message : "Unable to load analytics right now. Please try again.");
        }
      }
    }

    void loadAnalytics();

    return () => {
      active = false;
    };
  }, [accessToken, endSession]);

  const clickActivity = useMemo(() => data?.clickActivity[period] ?? [], [data, period]);

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
      </div>

      {error ? <Alert>{error}</Alert> : null}
      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.summary.map((item) => (
              <AnalyticsCard item={item} key={item.id} />
            ))}
          </div>

          <Card>
            <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Click activity</CardTitle>
                <CardDescription>Clicks over time for the selected reporting period.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {clickActivity.some((point) => point.clicks > 0) ? (
                <ClickChart data={clickActivity} />
              ) : (
                <EmptyState description="Clicks will appear here after someone opens one of your short URLs." icon={CircleAlert} title="No clicks yet" />
              )}
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

          <div className="grid gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Device analytics</CardTitle>
                <CardDescription>Share of clicks by device type.</CardDescription>
              </CardHeader>
              <CardContent>
                <DeviceChart data={data.devices} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Browser analytics</CardTitle>
                <CardDescription>Top browsers opening your short URLs.</CardDescription>
              </CardHeader>
              <CardContent>
                <BrowserAnalytics items={data.browsers} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Location analytics</CardTitle>
                <CardDescription>Top cities and countries generating clicks.</CardDescription>
              </CardHeader>
              <CardContent>
                <LocationAnalytics items={data.locations} />
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

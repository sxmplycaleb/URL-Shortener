import { useMemo, useState, type DragEvent } from "react";
import { Accessibility, Bell, FileText, GripVertical, Info, Keyboard, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { APP_DESCRIPTION, APP_NAME, APP_VERSION } from "@/lib/brand";
import { keyboardShortcuts } from "@/lib/keyboardShortcuts";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_WIDGET_LABELS,
  type DashboardPreset,
  type DashboardWidgetId,
} from "@/services/dashboardPreferences";

const presetOptions: Array<{ id: Exclude<DashboardPreset, "custom">; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "analytics-focus", label: "Analytics Focus" },
  { id: "productivity", label: "Productivity" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Cookie Policy", href: "/cookies" },
];

export function DashboardSettingsPage() {
  const {
    preferences,
    resetDashboard,
    resetPreferences,
    setPreset,
    setSidebarCollapsed,
    setWidgetOrder,
    setWidgetVisibility,
  } = useDashboardPreferences();
  const [draggedWidget, setDraggedWidget] = useState<DashboardWidgetId | null>(null);
  const visibleCount = useMemo(
    () => preferences.widgetOrder.filter((widgetId) => !preferences.hiddenWidgets.includes(widgetId)).length,
    [preferences.hiddenWidgets, preferences.widgetOrder],
  );

  function moveWidget(targetWidget: DashboardWidgetId) {
    if (!draggedWidget || draggedWidget === targetWidget) return;

    const nextOrder = preferences.widgetOrder.filter((widgetId) => widgetId !== draggedWidget);
    const targetIndex = nextOrder.indexOf(targetWidget);
    nextOrder.splice(targetIndex, 0, draggedWidget);
    setWidgetOrder(nextOrder);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Settings</h1>
        <p className="mt-1 text-muted-foreground">Customize your dashboard layout, widgets, and sidebar behavior.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard Layout</CardTitle>
          <CardDescription>{visibleCount} widgets visible. Changes save automatically on this device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-3" aria-labelledby="dashboard-presets-title">
            <h2 className="text-sm font-semibold" id="dashboard-presets-title">
              Layout Presets
            </h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Dashboard layout presets">
              {presetOptions.map((preset) => (
                <Button
                  key={preset.id}
                  variant={preferences.preset === preset.id ? "default" : "outline"}
                  aria-pressed={preferences.preset === preset.id}
                  onClick={() => setPreset(preset.id)}
                >
                  {preset.label}
                </Button>
              ))}
              <Button variant={preferences.preset === "custom" ? "default" : "outline"} aria-pressed={preferences.preset === "custom"} disabled>
                Custom
              </Button>
            </div>
          </section>

          <section className="space-y-3" aria-labelledby="widget-visibility-title">
            <h2 className="text-sm font-semibold" id="widget-visibility-title">
              Widget Visibility
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {preferences.widgetOrder.map((widgetId) => {
                const visible = !preferences.hiddenWidgets.includes(widgetId);

                return (
                  <label className="flex items-center justify-between gap-3 rounded-md border bg-background p-3 text-sm" key={widgetId}>
                    <span>{DASHBOARD_WIDGET_LABELS[widgetId]}</span>
                    <Switch
                      checked={visible}
                      aria-label={`${visible ? "Hide" : "Show"} ${DASHBOARD_WIDGET_LABELS[widgetId]}`}
                      onClick={() => setWidgetVisibility(widgetId, !visible)}
                    />
                  </label>
                );
              })}
            </div>
          </section>

          <section className="space-y-3" aria-labelledby="widget-order-title">
            <h2 className="text-sm font-semibold" id="widget-order-title">
              Widget Ordering
            </h2>
            <div className="space-y-2">
              {preferences.widgetOrder.map((widgetId) => (
                <div
                  key={widgetId}
                  className={cn(
                    "flex items-center gap-3 rounded-md border bg-background p-3 transition-opacity",
                    draggedWidget === widgetId ? "opacity-60" : "",
                  )}
                  draggable
                  onDragEnd={() => setDraggedWidget(null)}
                  onDragOver={(event: DragEvent<HTMLDivElement>) => event.preventDefault()}
                  onDragStart={() => setDraggedWidget(widgetId)}
                  onDrop={() => moveWidget(widgetId)}
                >
                  <Tooltip label={`Drag to reorder ${DASHBOARD_WIDGET_LABELS[widgetId]}`}>
                    <button className="cursor-grab rounded-md p-2 text-muted-foreground hover:bg-muted active:cursor-grabbing" type="button" aria-label={`Drag to reorder ${DASHBOARD_WIDGET_LABELS[widgetId]}`}>
                      <GripVertical className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </Tooltip>
                  <span className="text-sm font-medium">{DASHBOARD_WIDGET_LABELS[widgetId]}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3" aria-labelledby="sidebar-behavior-title">
            <h2 className="text-sm font-semibold" id="sidebar-behavior-title">
              Sidebar Behavior
            </h2>
            <label className="flex items-center justify-between gap-4 rounded-md border bg-background p-3">
              <span>
                <span className="block text-sm font-medium">Collapse desktop sidebar</span>
                <span className="block text-xs text-muted-foreground">Icons remain available with tooltips.</span>
              </span>
              <Switch
                checked={preferences.sidebarCollapsed}
                aria-label="Collapse desktop sidebar"
                onClick={() => setSidebarCollapsed(!preferences.sidebarCollapsed)}
              />
            </label>
          </section>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={resetDashboard}>
              <RotateCcw className="h-4 w-4" />
              Reset dashboard
            </Button>
            <Button variant="outline" onClick={resetPreferences}>
              <SlidersHorizontal className="h-4 w-4" />
              Reset preferences
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Keyboard className="h-4 w-4" aria-hidden="true" />
              Keyboard Shortcuts
            </CardTitle>
            <CardDescription>Available shortcuts for dashboard navigation and bulk link operations.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {keyboardShortcuts.map((shortcut) => (
              <div className="flex items-center justify-between gap-3 rounded-md border bg-background p-3" key={shortcut.keys}>
                <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                <kbd className="rounded-md border bg-muted px-2 py-1 text-xs font-semibold">{shortcut.keys}</kbd>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Accessibility className="h-4 w-4" aria-hidden="true" />
              Accessibility Preferences
            </CardTitle>
            <CardDescription>Future-ready controls for personal accessibility settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Reduce animation intensity", "Increase dashboard contrast", "Prefer larger touch targets"].map((label) => (
              <label className="flex items-center justify-between gap-4 rounded-md border bg-background p-3" key={label}>
                <span className="text-sm font-medium">{label}</span>
                <Switch checked={false} aria-label={label} disabled />
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" aria-hidden="true" />
              Legal Links
            </CardTitle>
            <CardDescription>Review application policies and future compliance pages.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3">
            {legalLinks.map((link) => (
              <Link className="rounded-md border bg-background p-3 text-sm font-medium transition-colors hover:bg-muted" key={link.href} to={link.href}>
                {link.label}
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4" aria-hidden="true" />
              About Application
            </CardTitle>
            <CardDescription>{APP_DESCRIPTION}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Name:</span> {APP_NAME}</p>
            <p><span className="font-medium text-foreground">Version:</span> v{APP_VERSION}</p>
            <p><span className="font-medium text-foreground">Notifications:</span> Future workspace, link activity, and security notification settings placeholder.</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" aria-hidden="true" />
              Future Notification Settings
            </CardTitle>
            <CardDescription>Placeholders for email, SMS, WhatsApp, product updates, and security alert channels.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

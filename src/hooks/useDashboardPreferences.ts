import { useCallback, useEffect, useMemo, useState } from "react";

import {
  applyDashboardPreset,
  DASHBOARD_PREFERENCES_CHANGED_EVENT,
  DEFAULT_DASHBOARD_PREFERENCES,
  type DashboardPreferences,
  type DashboardPreferenceStore,
  type DashboardPreset,
  type DashboardWidgetId,
  localDashboardPreferenceStore,
} from "@/services/dashboardPreferences";

export function useDashboardPreferences(store: DashboardPreferenceStore = localDashboardPreferenceStore) {
  const [preferences, setPreferences] = useState<DashboardPreferences>(() => store.load());

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncPreferences = () => setPreferences(store.load());
    window.addEventListener(DASHBOARD_PREFERENCES_CHANGED_EVENT, syncPreferences);
    window.addEventListener("storage", syncPreferences);

    return () => {
      window.removeEventListener(DASHBOARD_PREFERENCES_CHANGED_EVENT, syncPreferences);
      window.removeEventListener("storage", syncPreferences);
    };
  }, [store]);

  const persist = useCallback(
    (next: DashboardPreferences) => {
      store.save(next);
      setPreferences(next);
    },
    [store],
  );

  const setSidebarCollapsed = useCallback(
    (sidebarCollapsed: boolean) => {
      persist({ ...preferences, sidebarCollapsed });
    },
    [persist, preferences],
  );

  const setWidgetVisibility = useCallback(
    (widgetId: DashboardWidgetId, visible: boolean) => {
      const hiddenWidgets = visible
        ? preferences.hiddenWidgets.filter((item) => item !== widgetId)
        : [...new Set([...preferences.hiddenWidgets, widgetId])];
      persist({ ...preferences, hiddenWidgets, preset: "custom" });
    },
    [persist, preferences],
  );

  const setWidgetOrder = useCallback(
    (widgetOrder: DashboardWidgetId[]) => {
      persist({ ...preferences, widgetOrder, preset: "custom" });
    },
    [persist, preferences],
  );

  const setPreset = useCallback(
    (preset: Exclude<DashboardPreset, "custom">) => {
      persist(applyDashboardPreset(preferences, preset));
    },
    [persist, preferences],
  );

  const resetDashboard = useCallback(() => {
    persist({ ...preferences, ...DEFAULT_DASHBOARD_PREFERENCES, sidebarCollapsed: preferences.sidebarCollapsed });
  }, [persist, preferences]);

  const resetPreferences = useCallback(() => {
    const next = store.reset();
    setPreferences(next);
  }, [store]);

  return useMemo(
    () => ({
      preferences,
      resetDashboard,
      resetPreferences,
      setPreset,
      setSidebarCollapsed,
      setWidgetOrder,
      setWidgetVisibility,
    }),
    [preferences, resetDashboard, resetPreferences, setPreset, setSidebarCollapsed, setWidgetOrder, setWidgetVisibility],
  );
}

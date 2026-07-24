export type DashboardWidgetId = "stats" | "create-link" | "url-list";
export type DashboardPreset = "overview" | "analytics-focus" | "productivity" | "custom";

export interface DashboardPreferences {
  sidebarCollapsed: boolean;
  widgetOrder: DashboardWidgetId[];
  hiddenWidgets: DashboardWidgetId[];
  preset: DashboardPreset;
}

export interface DashboardPreferenceStore {
  load(): DashboardPreferences;
  save(preferences: DashboardPreferences): void;
  reset(): DashboardPreferences;
}

export const DASHBOARD_PREFERENCES_KEY = "shortly.dashboard.preferences";
export const DASHBOARD_PREFERENCES_CHANGED_EVENT = "shortly.dashboard.preferences.changed";
export const DEFAULT_WIDGET_ORDER: DashboardWidgetId[] = ["stats", "create-link", "url-list"];
export const DASHBOARD_WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  stats: "Statistics",
  "create-link": "Create short URL",
  "url-list": "Your URLs",
};

export const DASHBOARD_PRESETS: Record<Exclude<DashboardPreset, "custom">, DashboardWidgetId[]> = {
  overview: ["stats", "create-link", "url-list"],
  "analytics-focus": ["stats", "url-list", "create-link"],
  productivity: ["create-link", "stats", "url-list"],
};

export const DEFAULT_DASHBOARD_PREFERENCES: DashboardPreferences = {
  sidebarCollapsed: false,
  widgetOrder: DEFAULT_WIDGET_ORDER,
  hiddenWidgets: [],
  preset: "overview",
};

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function normalizePreferences(value: Partial<DashboardPreferences> | null | undefined): DashboardPreferences {
  const order = Array.isArray(value?.widgetOrder)
    ? value.widgetOrder.filter((item): item is DashboardWidgetId => DEFAULT_WIDGET_ORDER.includes(item as DashboardWidgetId))
    : [];
  const hiddenWidgets = Array.isArray(value?.hiddenWidgets)
    ? value.hiddenWidgets.filter((item): item is DashboardWidgetId => DEFAULT_WIDGET_ORDER.includes(item as DashboardWidgetId))
    : [];
  const uniqueOrder = [...new Set([...order, ...DEFAULT_WIDGET_ORDER])];
  const preset = value?.preset && (value.preset === "custom" || value.preset in DASHBOARD_PRESETS) ? value.preset : "overview";

  return {
    sidebarCollapsed: Boolean(value?.sidebarCollapsed),
    widgetOrder: uniqueOrder,
    hiddenWidgets: [...new Set(hiddenWidgets)],
    preset,
  };
}

export const localDashboardPreferenceStore: DashboardPreferenceStore = {
  load() {
    if (!canUseStorage()) return DEFAULT_DASHBOARD_PREFERENCES;

    try {
      const stored = window.localStorage.getItem(DASHBOARD_PREFERENCES_KEY);
      return normalizePreferences(stored ? (JSON.parse(stored) as Partial<DashboardPreferences>) : null);
    } catch {
      return DEFAULT_DASHBOARD_PREFERENCES;
    }
  },
  save(preferences) {
    if (!canUseStorage()) return;
    window.localStorage.setItem(DASHBOARD_PREFERENCES_KEY, JSON.stringify(normalizePreferences(preferences)));
    window.dispatchEvent(new Event(DASHBOARD_PREFERENCES_CHANGED_EVENT));
  },
  reset() {
    if (canUseStorage()) {
      window.localStorage.removeItem(DASHBOARD_PREFERENCES_KEY);
      window.dispatchEvent(new Event(DASHBOARD_PREFERENCES_CHANGED_EVENT));
    }
    return DEFAULT_DASHBOARD_PREFERENCES;
  },
};

export function applyDashboardPreset(preferences: DashboardPreferences, preset: Exclude<DashboardPreset, "custom">) {
  return {
    ...preferences,
    widgetOrder: DASHBOARD_PRESETS[preset],
    hiddenWidgets: [],
    preset,
  };
}

import { describe, expect, test } from "vitest";

import { applyDashboardPreset, DEFAULT_DASHBOARD_PREFERENCES } from "@/services/dashboardPreferences";

describe("dashboard preferences", () => {
  test("applies dashboard layout presets", () => {
    expect(applyDashboardPreset(DEFAULT_DASHBOARD_PREFERENCES, "analytics-focus")).toMatchObject({
      widgetOrder: ["stats", "url-list", "create-link"],
      hiddenWidgets: [],
      preset: "analytics-focus",
    });
  });
});

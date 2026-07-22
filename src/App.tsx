import { lazy, Suspense, type KeyboardEvent, type MouseEvent } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { AnimatePresence, motion } from "framer-motion";
import { Route, Routes, useLocation } from "react-router-dom";

import { LoadingState } from "@/components/common/LoadingState";
import { AppShell } from "@/components/layout/AppShell";
import { TooltipProvider } from "@/components/ui/tooltip";

const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage").then((module) => ({ default: module.AnalyticsPage })));
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const LandingPage = lazy(() => import("@/pages/LandingPage").then((module) => ({ default: module.LandingPage })));
const LoginPage = lazy(() => import("@/pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));
const RegisterPage = lazy(() => import("@/pages/RegisterPage").then((module) => ({ default: module.RegisterPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));

export function App() {
  const location = useLocation();

  function focusMainContent(event: MouseEvent<HTMLAnchorElement>) {
    const main = document.getElementById("main-content");
    if (!main) return;

    event.preventDefault();
    main.focus();
    main.scrollIntoView();
    window.history.replaceState(null, "", "#main-content");
  }

  function focusMainContentFromKeyboard(event: KeyboardEvent<HTMLAnchorElement>) {
    if (event.key !== "Enter") return;

    const main = document.getElementById("main-content");
    if (!main) return;

    event.preventDefault();
    main.focus();
    main.scrollIntoView();
    window.history.replaceState(null, "", "#main-content");
  }

  return (
    <TooltipProvider>
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        href="#main-content"
        onClick={focusMainContent}
        onKeyDown={focusMainContentFromKeyboard}
      >
        Skip to content
      </a>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          <Suspense fallback={<LoadingState label="Loading page" />}>
            <Routes location={location}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </motion.div>
      </AnimatePresence>
      <Analytics />
      <SpeedInsights />
    </TooltipProvider>
  );
}

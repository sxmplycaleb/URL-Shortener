import { lazy, Suspense, type KeyboardEvent, type MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Route, Routes, useLocation } from "react-router-dom";

import { LoadingState } from "@/components/common/LoadingState";
import { AppShell } from "@/components/layout/AppShell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage").then((module) => ({ default: module.AnalyticsPage })));
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const LandingPage = lazy(() => import("@/pages/LandingPage").then((module) => ({ default: module.LandingPage })));
const LoginPage = lazy(() => import("@/pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage").then((module) => ({ default: module.ForgotPasswordPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));
const RegisterPage = lazy(() => import("@/pages/RegisterPage").then((module) => ({ default: module.RegisterPage })));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage").then((module) => ({ default: module.ResetPasswordPage })));
const SecurityPage = lazy(() => import("@/pages/SecurityPage").then((module) => ({ default: module.SecurityPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));

export function App() {
  const location = useLocation();
  const pageTitle = getRoutePageTitle(location.pathname);
  useDocumentTitle(pageTitle);

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
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/security" element={<SecurityPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/security" element={<SecurityPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </TooltipProvider>
  );
}

function getRoutePageTitle(pathname: string) {
  if (pathname === "/") return "Home";
  if (pathname === "/login") return "Login";
  if (pathname === "/forgot-password") return "Forgot Password";
  if (pathname === "/register") return "Register";
  if (pathname === "/reset-password") return "Reset Password";
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/analytics") return "Analytics";
  if (pathname === "/settings/security" || pathname === "/security") return "Security";
  if (pathname === "/settings") return "Settings";
  return "404";
}

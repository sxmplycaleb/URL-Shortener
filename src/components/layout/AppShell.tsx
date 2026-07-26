import { useCallback, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

import { BackToTop } from "@/components/common/BackToTop";
import { CommandPalette } from "@/components/common/CommandPalette";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { logoutUser } from "@/services/auth";
import { clearAuthSession, getAuthSession } from "@/services/authStorage";
import { signOutOfFirebase } from "@/services/firebase";

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const session = getAuthSession();
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as { message?: string } | null;
  const { preferences, setSidebarCollapsed } = useDashboardPreferences();
  const openMobileNav = useCallback(() => setMobileOpen(true), []);
  const closeMobileNav = useCallback(() => setMobileOpen(false), []);

  const signOutAndRedirect = useCallback(async (message: string, preserveDestination = false) => {
    try {
      await signOutOfFirebase();
      await logoutUser();
    } catch {
      // Local session cleanup is still required if the server session is already gone.
    } finally {
      clearAuthSession();
      navigate("/login", {
        replace: true,
        state: { from: preserveDestination ? location.pathname : undefined, message },
      });
    }
  }, [location.pathname, navigate]);

  const handleLogout = useCallback(async () => {
    await signOutAndRedirect("You have been logged out.");
  }, [signOutAndRedirect]);

  const handleSwitchAccount = useCallback(async () => {
    await signOutAndRedirect("Choose another account to continue.", true);
  }, [signOutAndRedirect]);

  if (!session) {
    return (
      <Navigate
        replace
        state={{ from: location.pathname, message: locationState?.message ?? "Please log in to continue." }}
        to="/login"
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/25">
      <Navbar
        user={session.user}
        onCommandClick={() => setCommandOpen(true)}
        onLogout={handleLogout}
        onMenuClick={openMobileNav}
        onNavigateToDashboardSettings={() => navigate("/settings/dashboard")}
        onNavigateToProfile={() => navigate("/settings")}
        onSwitchAccount={handleSwitchAccount}
      />
      <div className="mx-auto flex w-full max-w-[1480px] flex-1">
        <Sidebar
          collapsed={preferences.sidebarCollapsed}
          open={mobileOpen}
          user={session.user}
          onClose={closeMobileNav}
          onCollapsedChange={setSidebarCollapsed}
          onLogout={handleLogout}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 xl:px-10" id="main-content" tabIndex={-1}>
            <div className="mx-auto w-full max-w-6xl">
              <Outlet />
            </div>
          </main>
          <Footer compact />
        </div>
      </div>
      <CommandPalette open={commandOpen} onLogout={handleLogout} onOpenChange={setCommandOpen} />
      <BackToTop />
    </div>
  );
}

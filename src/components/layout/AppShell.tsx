import { useCallback, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { logoutUser } from "@/services/auth";
import { clearAuthSession, getAuthSession } from "@/services/authStorage";

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const session = getAuthSession();
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as { message?: string } | null;
  const openMobileNav = useCallback(() => setMobileOpen(true), []);
  const closeMobileNav = useCallback(() => setMobileOpen(false), []);

  const handleLogout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // Local session cleanup is still required if the server session is already gone.
    } finally {
      clearAuthSession();
      navigate("/login", { replace: true, state: { message: "You have been logged out." } });
    }
  }, [navigate]);

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
    <div className="min-h-screen bg-background">
      <Navbar user={session.user} onLogout={handleLogout} onMenuClick={openMobileNav} />
      <div className="mx-auto flex w-full max-w-7xl">
        <Sidebar open={mobileOpen} user={session.user} onClose={closeMobileNav} onLogout={handleLogout} />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

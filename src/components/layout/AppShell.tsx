import { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";

import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const openMobileNav = useCallback(() => setMobileOpen(true), []);
  const closeMobileNav = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar onMenuClick={openMobileNav} />
      <div className="mx-auto flex w-full max-w-7xl">
        <Sidebar open={mobileOpen} onClose={closeMobileNav} />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

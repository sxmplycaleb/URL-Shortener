import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown, LogOut, Menu, Settings, Shuffle, UserCircle } from "lucide-react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/services/auth";

interface NavbarProps {
  user?: AuthUser;
  onMenuClick?: () => void;
  onLogout?: () => void;
  onNavigateToDashboardSettings?: () => void;
  onNavigateToProfile?: () => void;
  onSwitchAccount?: () => void;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export function Navbar({
  user,
  onMenuClick,
  onLogout,
  onNavigateToDashboardSettings,
  onNavigateToProfile,
  onSwitchAccount,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <BrandLogo to="/" />
        <nav className="hidden items-center gap-2 lg:flex" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`
              }
              to={item.href}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <ProfileDropdown
              user={user}
              onLogout={onLogout}
              onNavigateToDashboardSettings={onNavigateToDashboardSettings}
              onNavigateToProfile={onNavigateToProfile}
              onSwitchAccount={onSwitchAccount}
            />
          ) : null}
          <Button aria-label="Open navigation menu" className="lg:hidden" size="icon" variant="ghost" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function ProfileDropdown({
  user,
  onLogout,
  onNavigateToDashboardSettings,
  onNavigateToProfile,
  onSwitchAccount,
}: {
  user: AuthUser;
  onLogout?: (() => void) | undefined;
  onNavigateToDashboardSettings?: (() => void) | undefined;
  onNavigateToProfile?: (() => void) | undefined;
  onSwitchAccount?: (() => void) | undefined;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function run(action?: () => void) {
    setOpen(false);
    action?.();
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open profile menu"
        className="gap-2 px-2"
        variant="ghost"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md bg-accent text-xs font-bold text-accent-foreground">
          {user.avatar ? <img className="h-full w-full object-cover" src={user.avatar} alt="" /> : initials || "U"}
        </span>
        <span className="hidden min-w-0 text-left lg:block">
          <span className="block max-w-36 truncate text-sm font-medium">{user.name}</span>
          <span className="block max-w-36 truncate text-xs text-muted-foreground">{user.email}</span>
        </span>
        <ChevronDown className={cn("hidden h-4 w-4 transition-transform lg:block", open ? "rotate-180" : "")} />
      </Button>

      {open ? (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right animate-in rounded-md border bg-card p-2 shadow-panel"
          role="menu"
          aria-label="Profile menu"
        >
          <div className="mb-2 flex items-center gap-3 rounded-md bg-muted/70 p-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-accent text-sm font-bold text-accent-foreground">
              {user.avatar ? <img className="h-full w-full object-cover" src={user.avatar} alt="" /> : initials || "U"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <MenuButton icon={UserCircle} label="My Profile" onClick={() => run(onNavigateToProfile)} />
          <MenuButton icon={Settings} label="Settings" onClick={() => run(onNavigateToDashboardSettings)} />
          <MenuButton icon={Shuffle} label="Switch Account" onClick={() => run(onSwitchAccount)} />
          <div className="my-2 h-px bg-border" />
          <MenuButton icon={LogOut} label="Logout" onClick={() => run(onLogout)} />
        </div>
      ) : null}
    </div>
  );
}

function MenuButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof UserCircle;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      role="menuitem"
      type="button"
      onClick={onClick}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

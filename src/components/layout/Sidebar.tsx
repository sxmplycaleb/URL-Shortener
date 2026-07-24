import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import { BarChart3, ChevronLeft, ChevronRight, Home, LogOut, Settings, ShieldCheck, SlidersHorizontal, X } from "lucide-react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/services/auth";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings/security", label: "Security", icon: ShieldCheck },
  { href: "/settings/dashboard", label: "Dashboard Settings", icon: SlidersHorizontal },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  open?: boolean;
  user: AuthUser;
  onClose?: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onLogout: () => void;
}

export function Sidebar({ collapsed, open = false, user, onClose, onCollapsedChange, onLogout }: SidebarProps) {
  const labelId = useId();
  const mobilePanelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose?.();
        return;
      }
      if (event.key !== "Tab" || !mobilePanelRef.current) return;

      const focusableElements = Array.from(
        mobilePanelRef.current.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])'),
      ).filter((element) => !element.hasAttribute("disabled"));
      const first = focusableElements[0];
      const last = focusableElements.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = "";
      previousFocus?.focus();
    };
  }, [onClose, open]);

  return (
    <>
      <aside
        className={cn(
          "hidden shrink-0 border-r bg-card/50 p-4 transition-[width] duration-300 ease-out lg:block",
          collapsed ? "w-20" : "w-64",
        )}
        aria-label="Dashboard sidebar"
      >
        <SidebarContent
          collapsed={collapsed}
          user={user}
          onCollapsedChange={onCollapsedChange}
          onLogout={onLogout}
        />
      </aside>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onMouseDown={onClose}
          >
            <motion.aside
              ref={mobilePanelRef}
              aria-labelledby={labelId}
              aria-modal="true"
              className="flex h-full w-72 max-w-[85vw] flex-col border-r bg-card p-4 shadow-panel"
              role="dialog"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <Brand id={labelId} />
                <Button ref={closeButtonRef} aria-label="Close navigation menu" size="icon" variant="ghost" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <SidebarContent collapsed={false} mobile user={user} onNavigate={onClose} onLogout={onLogout} />
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function Brand({ id }: { id?: string }) {
  return (
    <BrandLogo className="font-semibold" id={id} to="/dashboard" />
  );
}

function SidebarContent({
  collapsed,
  mobile = false,
  user,
  onNavigate,
  onCollapsedChange,
  onLogout,
}: {
  collapsed: boolean;
  mobile?: boolean;
  user: AuthUser;
  onNavigate?: (() => void) | undefined;
  onCollapsedChange?: ((collapsed: boolean) => void) | undefined;
  onLogout: () => void;
}) {
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-full flex-col">
      <div className={cn("mb-8 hidden items-center lg:flex", collapsed ? "justify-center" : "justify-between")}>
        {collapsed ? (
          <Tooltip label="Shortly">
            <BrandLogo className="font-semibold" to="/dashboard" showText={false} />
          </Tooltip>
        ) : (
          <Brand />
        )}
        <Button
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(collapsed ? "mt-4" : "")}
          size="icon"
          variant="ghost"
          onClick={() => onCollapsedChange?.(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <div className={cn("mb-6 rounded-md border bg-background p-3", collapsed && !mobile ? "px-2" : "")}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-accent text-sm font-bold text-accent-foreground">
            {initials || "U"}
          </span>
          <div className={cn("min-w-0 transition-opacity", collapsed && !mobile ? "sr-only" : "")}>
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>
      <nav className="space-y-1" aria-label="Dashboard navigation">
        {items.map((item) => (
          <SidebarLink
            key={item.href}
            collapsed={collapsed && !mobile}
            href={item.href}
            icon={item.icon}
            label={item.label}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
      <Button
        aria-label="Logout"
        className={cn("mt-auto", collapsed && !mobile ? "justify-center px-0" : "justify-start")}
        variant="ghost"
        onClick={onLogout}
      >
        <LogOut className="h-4 w-4" />
        <span className={cn(collapsed && !mobile ? "sr-only" : "")}>Logout</span>
      </Button>
    </div>
  );
}

function SidebarLink({
  collapsed,
  href,
  icon: Icon,
  label,
  onNavigate,
}: {
  collapsed: boolean;
  href: string;
  icon: typeof Home;
  label: string;
  onNavigate?: (() => void) | undefined;
}) {
  const accessibleLabel = label === "Dashboard Settings" ? "Dashboard preferences" : label;
  const link = (
    <NavLink
      aria-label={collapsed || label === "Dashboard Settings" ? accessibleLabel : undefined}
      className={({ isActive }) =>
        cn(
          "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
          collapsed ? "justify-center px-0" : "",
          isActive ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )
      }
      to={href}
      onClick={onNavigate}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className={cn(collapsed ? "sr-only" : "")}>{label}</span>
    </NavLink>
  );

  return collapsed ? <Tooltip label={label}>{link}</Tooltip> : link;
}

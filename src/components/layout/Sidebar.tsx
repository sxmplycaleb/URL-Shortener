import { useEffect, useId, useRef } from "react";
import { NavLink } from "react-router-dom";
import { BarChart3, Home, Link2, LogOut, Settings, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const labelId = useId();
  const mobilePanelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    mobilePanelRef.current?.querySelector<HTMLElement>("button, [href]")?.focus();

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
      document.body.style.overflow = "";
      previousFocus?.focus();
    };
  }, [onClose, open]);

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r bg-card/50 p-4 lg:block">
        <SidebarContent />
      </aside>
      <div
        className={cn("fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden", open ? "block" : "hidden")}
        role="presentation"
        onMouseDown={onClose}
      >
        <aside
          ref={mobilePanelRef}
          aria-labelledby={labelId}
          aria-modal="true"
          className="h-full w-72 max-w-[85vw] border-r bg-card p-4 shadow-panel"
          role="dialog"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <Brand id={labelId} />
            <Button aria-label="Close navigation menu" size="icon" variant="ghost" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <SidebarContent onNavigate={onClose} />
        </aside>
      </div>
    </>
  );
}

function Brand({ id }: { id?: string }) {
  return (
    <div className="flex items-center gap-2 font-semibold" id={id}>
      <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
        <Link2 className="h-5 w-5" aria-hidden="true" />
      </span>
      Shortly
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-8 hidden lg:block">
        <Brand />
      </div>
      <nav className="space-y-1" aria-label="Dashboard navigation">
        {items.map((item) => (
          <NavLink
            key={item.href}
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`
            }
            to={item.href}
            onClick={onNavigate}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <Button className="mt-auto justify-start" variant="ghost">
        <LogOut className="h-4 w-4" />
        Log out
      </Button>
    </div>
  );
}

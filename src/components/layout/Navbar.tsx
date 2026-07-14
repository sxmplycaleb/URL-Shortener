import { Link, NavLink } from "react-router-dom";
import { Link2, Menu } from "lucide-react";

import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/buttonVariants";
import { cn } from "@/lib/utils";

interface NavbarProps {
  onMenuClick?: () => void;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export function Navbar({ onMenuClick }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-2 font-semibold" to="/">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Link2 className="h-5 w-5" aria-hidden="true" />
          </span>
          Shortly
        </Link>
        <nav className="hidden items-center gap-2 md:flex" aria-label="Main navigation">
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
          <Link className={cn(buttonVariants({ variant: "outline" }), "hidden sm:inline-flex")} to="/login">
            Log in
          </Link>
          <Link className={cn(buttonVariants(), "hidden sm:inline-flex")} to="/register">
            Sign up
          </Link>
          <Button aria-label="Open navigation menu" className="md:hidden" size="icon" variant="ghost" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

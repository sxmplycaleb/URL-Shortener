import { useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, ChartNoAxesColumnIncreasing, Link2, Menu, ShieldCheck, Tags, X, Zap } from "lucide-react";

import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/buttonVariants";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const navigationItems = [
  { label: "Home", href: "/" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Login", href: "/login" },
  { label: "Register", href: "/register" },
];

const features = [
  {
    icon: Zap,
    title: "Shorten URLs instantly",
    description: "Create compact, shareable links from long URLs with a focused flow built for speed.",
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    title: "Dashboard management",
    description: "Keep links organized, update destinations, and manage active campaigns from one place.",
  },
  {
    icon: BarChart3,
    title: "Click analytics",
    description: "Track engagement signals so every link gives you clear feedback after it goes live.",
  },
  {
    icon: ShieldCheck,
    title: "Secure authentication",
    description: "Protect accounts and link ownership with authentication-ready workflows.",
  },
  {
    icon: Tags,
    title: "Custom aliases",
    description: "Use memorable aliases that make links easier to recognize, share, and trust.",
  },
];

function LandingNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-2 font-semibold" to="/" onClick={() => setIsOpen(false)}>
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Link2 className="h-5 w-5" aria-hidden="true" />
          </span>
          Shortly
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {navigationItems.map((item) =>
            item.href.startsWith("/") ? (
              <Link
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                key={item.label}
                to={item.href}
              >
                {item.label}
              </Link>
            ) : (
              <a
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                href={item.href}
                key={item.label}
              >
                {item.label}
              </a>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            aria-controls="mobile-navigation"
            aria-expanded={isOpen}
            aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
            className="md:hidden"
            size="icon"
            variant="ghost"
            onClick={() => setIsOpen((current) => !current)}
          >
            {isOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {isOpen ? (
        <nav
          aria-label="Mobile navigation"
          className="border-t bg-background px-4 py-3 shadow-soft md:hidden"
          id="mobile-navigation"
        >
          <div className="mx-auto grid max-w-7xl gap-1">
            {navigationItems.map((item) =>
              item.href.startsWith("/") ? (
                <Link
                  className="rounded-md px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  key={item.label}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  className="rounded-md px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  href={item.href}
                  key={item.label}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </a>
              ),
            )}
          </div>
        </nav>
      ) : null}
    </header>
  );
}

function FeatureCard({ feature }: { feature: (typeof features)[number] }) {
  return (
    <Card className="flex h-full flex-col p-6 transition-colors hover:border-primary/40 hover:bg-card/80">
      <span className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-primary">
        <feature.icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <CardTitle className="mt-5 text-base leading-6">{feature.title}</CardTitle>
      <CardDescription className="mt-3 leading-6">{feature.description}</CardDescription>
    </Card>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main id="main-content">
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center">
            <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">Shortly</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Create short, memorable links, manage them from a clean dashboard, and understand every click with practical analytics.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")} to="/register">
                Get Started
              </Link>
              <Link className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")} to="/login">
                Login
              </Link>
            </div>
          </div>

          <Card className="overflow-hidden shadow-panel">
            <div className="border-b bg-muted/40 p-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-destructive" aria-hidden="true" />
                <span className="h-3 w-3 rounded-full bg-warning" aria-hidden="true" />
                <span className="h-3 w-3 rounded-full bg-success" aria-hidden="true" />
              </div>
            </div>
            <div className="space-y-5 p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Long URL</p>
                <p className="mt-2 break-words rounded-md border bg-background p-3 font-mono text-sm">
                  https://example.com/campaign/product-launch/summer
                </p>
              </div>
              <div className="rounded-md border bg-primary/10 p-4 text-primary">
                <p className="text-sm font-semibold">Short link ready</p>
                <p className="mt-2 font-mono text-sm">short.ly/summer</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {["12.8K clicks", "34 regions", "99.9% uptime"].map((metric) => (
                  <div className="rounded-md border bg-background p-4" key={metric}>
                    <p className="font-semibold">{metric}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Live summary</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        <section className="border-y bg-card/40 py-14 sm:py-16" id="features">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold leading-tight">Features built for everyday link operations</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Everything visitors need to understand the product before creating an account.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <FeatureCard feature={feature} key={feature.title} />
              ))}
            </div>
          </div>
        </section>

        <section className="sr-only" id="pricing" aria-label="Pricing placeholder">
          Pricing information will be available later.
        </section>

        <section className="px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-lg border bg-primary p-6 text-primary-foreground shadow-panel sm:p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold leading-tight sm:text-3xl">Ready to shorten your first URL?</h2>
              <p className="mt-3 max-w-2xl text-primary-foreground/80">
                Register now to save links, manage aliases, and review click activity from your dashboard.
              </p>
            </div>
            <Link className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-full shrink-0 sm:w-auto")} to="/register">
              Create account
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

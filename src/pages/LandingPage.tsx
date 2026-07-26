import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  ChartNoAxesColumnIncreasing,
  Check,
  Clock3,
  Copy,
  Gauge,
  Link2,
  Menu,
  MousePointerClick,
  QrCode,
  Send,
  ShieldCheck,
  Tags,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { AnimatedCounter } from "@/components/common/AnimatedCounter";
import { BackToTop } from "@/components/common/BackToTop";
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
    title: "Instant link creation",
    description: "Turn long campaign URLs into clean, memorable short links with a fast creation flow.",
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    title: "Operational dashboard",
    description: "Review, edit, and organize every active link without losing sight of what is live.",
  },
  {
    icon: BarChart3,
    title: "Click analytics",
    description: "See engagement patterns, campaign momentum, and redirect activity at a glance.",
  },
  {
    icon: ShieldCheck,
    title: "Account protection",
    description: "Keep link ownership and workspace access protected with secure authentication workflows.",
  },
  {
    icon: Tags,
    title: "Custom aliases",
    description: "Create recognizable branded aliases that make shared links easier to trust.",
  },
  {
    icon: QrCode,
    title: "Share-ready links",
    description: "Prepare short links for social, email, print, and partner channels from one place.",
  },
];

const stats = [
  { label: "links created", value: 128000, suffix: "+", icon: Link2 },
  { label: "monthly redirects", value: 2400000, suffix: "+", icon: MousePointerClick },
  { label: "uptime", value: 99.9, suffix: "%", icon: Gauge },
  { label: "active users", value: 8600, suffix: "+", icon: Users },
];

const steps = [
  {
    icon: Link2,
    title: "Create",
    description: "Paste a destination, choose an alias when it matters, and generate a short link in seconds.",
  },
  {
    icon: Send,
    title: "Share",
    description: "Use the same reliable link across launch emails, social posts, messages, and partner channels.",
  },
  {
    icon: TrendingUp,
    title: "Track",
    description: "Watch redirects and engagement signals so each link keeps teaching you after it goes live.",
  },
];

function LandingNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <BrandLogo to="/" onClick={() => setIsOpen(false)} />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {navigationItems.map((item) =>
            item.href.startsWith("/") ? (
              <Link className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" key={item.label} to={item.href}>
                {item.label}
              </Link>
            ) : (
              <a className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" href={item.href} key={item.label}>
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
        <nav aria-label="Mobile navigation" className="border-t bg-background px-4 py-3 shadow-soft md:hidden" id="mobile-navigation">
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
    <Card className="group flex h-full flex-col p-6 transition-all duration-200 ease-out hover:-translate-y-1 hover:border-primary/45 hover:shadow-sm">
      <span className="grid h-11 w-11 place-items-center rounded-md border bg-primary/10 text-primary transition-colors duration-200 ease-out group-hover:bg-primary group-hover:text-primary-foreground">
        <feature.icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <CardTitle className="mt-5 text-base leading-6">{feature.title}</CardTitle>
      <CardDescription className="mt-3 leading-6">{feature.description}</CardDescription>
    </Card>
  );
}

function StatItem({ stat }: { stat: (typeof stats)[number] }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
        <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
          <stat.icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-5 text-3xl font-bold leading-tight">
        {stat.value === 99.9 ? (
          "99.9"
        ) : (
          <AnimatedCounter value={stat.value} />
        )}
        <span>{stat.suffix}</span>
      </p>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingNav />
      <main className="flex-1" id="main-content">
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,hsl(var(--card)),transparent_44%,hsl(var(--background)))]" aria-hidden="true" />
          <div
            className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.38)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.38)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40"
            aria-hidden="true"
          />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-24">
            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm font-medium text-muted-foreground shadow-xs">
                <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
                Fast short links for focused teams
              </div>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                Short links that feel polished from the first click.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Create memorable links, keep every campaign organized, and understand where traffic is moving without leaving your workspace.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")} to="/register">
                  Start shortening
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")} to="/login">
                  View dashboard
                </Link>
              </div>
              <ul className="mt-7 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                {["Custom aliases", "Live analytics", "Secure accounts"].map((item) => (
                  <li className="flex items-center gap-2" key={item}>
                    <Check className="h-4 w-4 text-success" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <Card className="overflow-hidden shadow-panel">
                <div className="border-b bg-muted/50 p-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-destructive" aria-hidden="true" />
                    <span className="h-3 w-3 rounded-full bg-warning" aria-hidden="true" />
                    <span className="h-3 w-3 rounded-full bg-success" aria-hidden="true" />
                  </div>
                </div>
                <div className="space-y-5 p-5 sm:p-6">
                  <div className="rounded-md border bg-background p-4">
                    <p className="text-sm font-medium text-muted-foreground">Destination URL</p>
                    <p className="mt-2 break-words font-mono text-sm">https://example.com/campaign/product-launch/summer</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="rounded-md border bg-primary/10 p-4 text-primary">
                      <p className="text-sm font-semibold">Short link ready</p>
                      <p className="mt-2 font-mono text-sm">short.ly/summer</p>
                    </div>
                    <Button aria-label="Copy short link" size="icon" variant="secondary">
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    </Button>
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
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20" id="features">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase text-primary">Features</p>
                <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">Built for everyday link operations</h2>
              </div>
              <p className="max-w-2xl leading-7 text-muted-foreground lg:ml-auto">
                A public-facing product experience that explains the essentials quickly: create cleaner links, manage active campaigns, and learn from every redirect.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <FeatureCard feature={feature} key={feature.title} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-y bg-card/50 py-14 sm:py-16" aria-labelledby="stats-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase text-primary">Social proof</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl" id="stats-heading">
                Trusted traffic signals at a glance
              </h2>
            </div>
            <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <StatItem key={stat.label} stat={stat} />
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20" aria-labelledby="how-it-works-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase text-primary">How it works</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl" id="how-it-works-heading">
                Three steps from long URL to useful insight
              </h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <div className="relative rounded-lg border bg-card p-6 shadow-xs" key={step.title}>
                  <span className="absolute right-5 top-5 text-sm font-bold text-muted-foreground">0{index + 1}</span>
                  <span className="grid h-12 w-12 place-items-center rounded-md bg-primary/10 text-primary">
                    <step.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
                  <p className="mt-3 leading-7 text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="sr-only" id="pricing" aria-label="Pricing">
          Pricing information will be available later.
        </section>

        <section className="px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-lg border bg-primary p-6 text-primary-foreground shadow-panel sm:p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-primary-foreground/80">Ready when you are</p>
              <h2 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">Create a short link your audience can trust.</h2>
              <p className="mt-3 max-w-2xl text-primary-foreground/80">
                Register now to save links, manage aliases, and review click activity from your dashboard.
              </p>
            </div>
            <Link className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-full shrink-0 sm:w-auto")} to="/register">
              Create account
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <Footer variant="landing" />
      <BackToTop />
    </div>
  );
}

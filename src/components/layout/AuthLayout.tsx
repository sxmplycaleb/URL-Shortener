import { ShieldCheck, Sparkles, TimerReset } from "lucide-react";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface AuthLayoutProps {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}

const highlights = [
  { icon: ShieldCheck, label: "Secure sessions" },
  { icon: TimerReset, label: "Fast recovery" },
  { icon: Sparkles, label: "Clean link control" },
];

export function AuthLayout({ children, description, eyebrow, title }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main
        className="grid flex-1 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,30rem)] lg:gap-8 lg:px-8 lg:py-8"
        id="main-content"
        tabIndex={-1}
      >
        <section
          className="relative hidden overflow-hidden rounded-xl border border-border bg-secondary p-8 shadow-panel lg:flex lg:min-h-[calc(100vh-4rem)] lg:flex-col lg:justify-between"
          aria-label="Shortly authentication overview"
        >
          <div
            className="absolute inset-0 opacity-80"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(circle at 18% 18%, hsl(var(--primary) / 0.22), transparent 28%), linear-gradient(135deg, hsl(var(--card) / 0.96), hsl(var(--secondary)))",
            }}
          />
          <div
            className="absolute inset-0 opacity-55"
            aria-hidden="true"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--border) / 0.55) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.55) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              maskImage: "linear-gradient(to bottom right, black, transparent 82%)",
            }}
          />
          <div className="relative z-base flex items-center justify-between">
            <BrandLogo to="/" />
            <ThemeToggle />
          </div>
          <div className="relative z-base max-w-xl space-y-6">
            <Badge variant="muted" className="w-fit border border-border bg-card/80 text-foreground shadow-xs">
              {eyebrow}
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-lg text-4xl font-bold leading-tight tracking-normal text-foreground">{title}</h1>
              <p className="max-w-md text-base leading-7 text-muted-foreground">{description}</p>
            </div>
            <Card className="max-w-md bg-card/86 p-4 shadow-soft backdrop-blur">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border bg-secondary" fallback="SL" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Protected by familiar checks</p>
                  <p className="text-sm text-muted-foreground">Password, OTP, and Google sign-in stay exactly where users expect them.</p>
                </div>
              </div>
            </Card>
          </div>
          <div className="relative z-base grid grid-cols-3 gap-3">
            {highlights.map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-md border border-border bg-card/78 p-3 shadow-xs backdrop-blur">
                <Icon className="mb-3 h-4 w-4 text-primary" aria-hidden="true" />
                <p className="text-sm font-medium leading-5 text-foreground">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-lg flex-col justify-center py-4 lg:max-w-none" aria-label="Authentication form">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <BrandLogo to="/" />
            <ThemeToggle />
          </div>
          {children}
        </section>
      </main>
    </div>
  );
}

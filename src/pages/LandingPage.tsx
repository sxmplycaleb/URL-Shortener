import { useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, CheckCircle2, Lock, QrCode, Sparkles, Zap } from "lucide-react";

import { CopyButton } from "@/components/common/CopyButton";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { CreateLinkForm } from "@/components/forms/CreateLinkForm";
import { Footer } from "@/components/layout/Footer";
import { buttonVariants } from "@/components/ui/buttonVariants";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const features = [
  { icon: Zap, title: "Fast redirects", description: "A focused UI for creating links that stay quick under real traffic." },
  { icon: Lock, title: "Safer destinations", description: "Designed around validation, ownership, expiration, and abuse controls." },
  { icon: BarChart3, title: "Actionable analytics", description: "Understand clicks by time, referrer, country, browser, and device." },
];

export function LandingPage() {
  const [shortUrl, setShortUrl] = useState("https://sho.rt/demo");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-2 font-semibold" to="/">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            Shortly
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex" aria-label="Landing navigation">
            <a className="hover:text-foreground" href="#features">
              Features
            </a>
            <a className="hover:text-foreground" href="#how-it-works">
              How it works
            </a>
            <a className="hover:text-foreground" href="#faq">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link className={buttonVariants({ variant: "outline" })} to="/login">
              Log in
            </Link>
          </div>
        </div>
      </header>
      <main id="main-content">
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <p className="mb-4 inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              Secure link management for modern teams
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Short links with clean workflows and useful analytics.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Create branded short links, validate risky destinations, monitor performance, and keep ownership controls ready for production.
            </p>
            <div className="mt-8">
              <CreateLinkForm compact onCreated={setShortUrl} />
            </div>
            <Card className="mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Generated link</p>
                <p className="mt-1 font-mono text-sm">{shortUrl}</p>
              </div>
              <CopyButton label="Copy generated link" value={shortUrl} />
            </Card>
          </div>
          <Card className="grid content-between gap-6 p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Live preview</span>
              <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">Active</span>
            </div>
            <div className="space-y-5">
              <div className="rounded-lg border bg-muted/40 p-5">
                <p className="text-sm text-muted-foreground">Destination</p>
                <p className="mt-2 break-words font-mono text-sm">https://example.com/campaign/product-launch?utm_source=newsletter</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {["18.4K clicks", "42 countries", "2.1% errors"].map((item) => (
                  <div className="rounded-lg border p-4" key={item}>
                    <p className="font-semibold">{item}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Last 7 days</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <QrCode className="h-5 w-5" aria-hidden="true" />
              QR cards, API keys, and detailed reporting are ready in the dashboard.
            </div>
          </Card>
        </section>
        <section className="border-y bg-card/40 py-12" id="features">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
            {features.map((feature) => (
              <Card className="p-6" key={feature.title}>
                <feature.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </section>
        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8" id="how-it-works">
          <div>
            <h2 className="text-3xl font-bold">How it works</h2>
            <p className="mt-3 text-muted-foreground">A short path from paste to measurable link.</p>
          </div>
          <ol className="space-y-4">
            {["Paste a validated URL.", "Choose an alias and expiration.", "Copy the short link.", "Track clicks and manage lifecycle."].map((step) => (
              <li className="flex gap-3" key={step}>
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="mx-auto max-w-4xl px-4 pb-14 sm:px-6" id="faq">
          <h2 className="text-3xl font-bold">FAQ</h2>
          <div className="mt-6 grid gap-4">
            {[
              ["Can anonymous users create links?", "Yes, the UI supports anonymous creation while keeping management-token flows in mind."],
              ["What happens when a link expires?", "The dashboard marks it expired and disables sharing actions until the owner updates it."],
              ["Is dark mode supported?", "Yes, preference is stored locally and applied across every page."],
            ].map(([question, answer]) => (
              <Card className="p-5" key={question}>
                <h3 className="font-semibold">{question}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{answer}</p>
              </Card>
            ))}
          </div>
        </section>
        <section className="border-y bg-primary py-12 text-primary-foreground">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <div>
              <h2 className="text-2xl font-bold">Ready to manage links?</h2>
              <p className="mt-2 text-primary-foreground/80">Open the dashboard and start from a production-shaped UI.</p>
            </div>
            <Link className={cn(buttonVariants({ variant: "secondary" }), "w-full sm:w-auto")} to="/dashboard">
              Open dashboard
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

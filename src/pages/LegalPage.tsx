import { Link, useLocation } from "react-router-dom";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { BackToTop } from "@/components/common/BackToTop";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { APP_NAME } from "@/lib/brand";

const legalPages = {
  "/privacy": {
    title: "Privacy Policy",
    lastUpdated: "July 24, 2026",
    intro: "This policy explains how Shortly will handle account, link, analytics, and security information as the product grows.",
    sections: [
      ["Information We Collect", "Account details, shortened URLs, click analytics, device metadata, and security records may be collected to provide and protect the service."],
      ["How We Use Information", "Information is used to operate short links, show analytics, secure sessions, support users, and improve product reliability."],
      ["Data Sharing", "We do not sell personal information. Service providers may process data only for hosting, authentication, analytics, communications, and security operations."],
      ["Retention", "Account and link data is retained while an account is active. Future retention controls may allow export, deletion, and workspace policies."],
      ["Your Choices", "Future releases may include richer privacy controls, notification preferences, data export, and account deletion workflows."],
    ],
  },
  "/terms": {
    title: "Terms of Service",
    lastUpdated: "July 24, 2026",
    intro: "These terms outline acceptable use and service expectations for Shortly users and future workspaces.",
    sections: [
      ["Using Shortly", "Users are responsible for links they create and must keep account credentials secure."],
      ["Acceptable Use", "Shortly may not be used for phishing, malware, harassment, illegal content, or attempts to bypass platform security."],
      ["Service Availability", "The product may evolve, add paid plans, introduce workspace controls, or change availability as operations mature."],
      ["Content and Links", "Users retain responsibility for destination URLs, labels, aliases, and shared content associated with their accounts."],
      ["Future Terms", "Billing, team administration, service-level commitments, and data-processing terms can be added as the product expands."],
    ],
  },
  "/cookies": {
    title: "Cookie Policy",
    lastUpdated: "July 24, 2026",
    intro: "This policy describes current and future cookie-style storage used for authentication, preferences, and product quality.",
    sections: [
      ["Essential Storage", "Authentication sessions, refresh tokens, security metadata, and dashboard preferences help the app function reliably."],
      ["Analytics Storage", "Future analytics tools may use privacy-conscious measurement to understand product usage and performance."],
      ["Preference Storage", "Theme, sidebar, dashboard layout, command history, and notification settings can be saved on the device."],
      ["Managing Cookies", "Browser settings can clear local storage and cookies, though doing so may sign users out or reset preferences."],
      ["Future Controls", "A dedicated consent and cookie-preference center can be added when marketing or third-party analytics expand."],
    ],
  },
} as const;

const legalNavLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Cookies", href: "/cookies" },
];

export function LegalPage() {
  const location = useLocation();
  const page = legalPages[location.pathname as keyof typeof legalPages] ?? legalPages["/privacy"];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LegalHeader />
      <main className="flex-1" id="main-content">
        <section className="border-b bg-card/40">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
            <Badge variant="muted">Legal</Badge>
            <h1 className="mt-4 text-4xl font-bold leading-tight">{page.title}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">{page.intro}</p>
            <p className="mt-4 text-sm text-muted-foreground">Last Updated: {page.lastUpdated}</p>
          </div>
        </section>

        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card className="p-4">
              <h2 className="font-semibold">Table of Contents</h2>
              <nav className="mt-3 space-y-2" aria-label={`${page.title} table of contents`}>
                {page.sections.map(([title]) => (
                  <a className="block text-sm text-muted-foreground transition-colors hover:text-foreground" href={`#${slugify(title)}`} key={title}>
                    {title}
                  </a>
                ))}
              </nav>
            </Card>
          </aside>

          <article className="space-y-8">
            {page.sections.map(([title, body]) => (
              <section className="scroll-mt-24 space-y-3" id={slugify(title)} key={title}>
                <h2 className="text-2xl font-semibold">{title}</h2>
                <p className="leading-7 text-muted-foreground">{body}</p>
              </section>
            ))}
            <section className="rounded-lg border bg-card p-5">
              <h2 className="text-xl font-semibold">Questions</h2>
              <p className="mt-2 leading-7 text-muted-foreground">
                Contact {APP_NAME} through the footer contact options while dedicated legal and support mailboxes are finalized.
              </p>
              <Link className="mt-4 inline-flex text-sm font-medium text-primary hover:underline" to="/dashboard">
                Return to dashboard
              </Link>
            </section>
          </article>
        </div>
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}

function LegalHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <BrandLogo to="/" />
        <nav className="flex items-center gap-1" aria-label="Legal page navigation">
          {legalNavLinks.map((link) => (
            <Link className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex" key={link.href} to={link.href}>
              {link.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

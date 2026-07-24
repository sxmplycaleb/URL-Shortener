import { Link } from "react-router-dom";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { SocialIcon } from "@/components/common/SocialIcon";
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_VERSION,
  CONTACT_EMAIL_PLACEHOLDER,
  CONTACT_PHONE,
  CONTACT_WHATSAPP_URL,
  OFFICE_LOCATION_PLACEHOLDER,
  SOCIAL_LINKS,
} from "@/lib/brand";

const footerSections = [
  {
    title: "Product",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Analytics", href: "/analytics" },
      { label: "Settings", href: "/settings" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t bg-card/70 text-sm text-muted-foreground">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.9fr_1fr_1fr] lg:px-8">
        <div className="space-y-4">
          <BrandLogo iconClassName="h-9 w-9" to="/" />
          <p className="max-w-sm leading-6">{APP_DESCRIPTION}</p>
        </div>

        {footerSections.map((section) => (
          <nav aria-label={`${section.title} footer links`} className="space-y-3" key={section.title}>
            <h2 className="text-sm font-semibold text-foreground">{section.title}</h2>
            <ul className="space-y-2">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link className="transition-colors hover:text-foreground" to={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <address className="space-y-3 not-italic">
          <h2 className="text-sm font-semibold text-foreground">Contact</h2>
          <a className="flex items-center gap-2 transition-colors hover:text-foreground" href={`tel:${CONTACT_PHONE}`}>
            <Phone className="h-4 w-4" aria-hidden="true" />
            {CONTACT_PHONE}
          </a>
          <a
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-input px-3 font-medium text-foreground transition-colors hover:bg-muted"
            href={CONTACT_WHATSAPP_URL}
            rel="noreferrer"
            target="_blank"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            WhatsApp
          </a>
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4" aria-hidden="true" />
            {CONTACT_EMAIL_PLACEHOLDER}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {OFFICE_LOCATION_PLACEHOLDER}
          </p>
        </address>

        <nav aria-label="Follow us" className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Follow Us</h2>
          <div className="flex flex-wrap gap-2">
            {SOCIAL_LINKS.map((link) => (
              <a
                aria-label={`Follow Shortly on ${link.label}`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-input text-muted-foreground transition hover:-translate-y-0.5 hover:bg-muted hover:text-foreground"
                href={link.href}
                key={link.id}
                rel="noreferrer"
                target="_blank"
              >
                <SocialIcon id={link.id} />
              </a>
            ))}
          </div>
        </nav>
      </div>

      <div className="border-t bg-background/60">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>&copy; {year} {APP_NAME}. All rights reserved.</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>v{APP_VERSION}</span>
            <span aria-hidden="true">/</span>
            <span>Made with <span aria-label="love">♥</span></span>
          </p>
        </div>
      </div>
    </footer>
  );
}

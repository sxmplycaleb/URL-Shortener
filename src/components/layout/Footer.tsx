import { BrandLogo } from "@/components/brand/BrandLogo";
import { APP_NAME, APP_VERSION, GITHUB_URL } from "@/lib/brand";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t bg-card/40 py-6 text-sm text-muted-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="min-w-0 space-y-2">
          <BrandLogo iconClassName="h-8 w-8" to="/" />
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>&copy; {year} {APP_NAME}</span>
            <span aria-hidden="true">/</span>
            <span className="inline-flex items-center gap-1">
              Made with <span aria-label="love">❤️</span>
            </span>
            <span aria-hidden="true">/</span>
            <span>v{APP_VERSION}</span>
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer navigation">
          <a className="transition-colors hover:text-foreground" href="/privacy">
            Privacy Policy
          </a>
          <a className="transition-colors hover:text-foreground" href="/terms">
            Terms
          </a>
          <a className="transition-colors hover:text-foreground" href={GITHUB_URL} rel="noreferrer" target="_blank">
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}

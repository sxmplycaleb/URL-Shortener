export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t py-8 text-sm text-muted-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p>&copy; {year} Shortly. All rights reserved.</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer navigation">
          <a className="transition-colors hover:text-foreground" href="#" aria-label="GitHub placeholder">
            GitHub
          </a>
          <a className="transition-colors hover:text-foreground" href="#" aria-label="Privacy placeholder">
            Privacy
          </a>
          <a className="transition-colors hover:text-foreground" href="#" aria-label="Terms placeholder">
            Terms
          </a>
        </nav>
      </div>
    </footer>
  );
}

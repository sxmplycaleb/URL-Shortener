import { Link } from "react-router-dom";
import { Compass, Home, LayoutDashboard } from "lucide-react";

import { Footer } from "@/components/layout/Footer";
import { buttonVariants } from "@/components/ui/buttonVariants";
import { Card } from "@/components/ui/card";
import { getAuthSession } from "@/services/authStorage";

export function NotFoundPage() {
  const isAuthenticated = Boolean(getAuthSession());
  const destination = isAuthenticated ? "/dashboard" : "/";
  const actionLabel = isAuthenticated ? "Return to Dashboard" : "Return to Home";
  const ActionIcon = isAuthenticated ? LayoutDashboard : Home;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="grid flex-1 place-items-center px-4 py-16" id="main-content">
        <Card className="w-full max-w-xl p-8 text-center shadow-soft sm:p-10">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-primary/10">
          <Compass className="h-12 w-12 text-primary" aria-hidden="true" />
        </div>
        <p className="mt-8 text-7xl font-bold leading-none text-primary sm:text-8xl">404</p>
        <h1 className="mt-5 text-3xl font-bold">Page Not Found</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          The page does not exist or has been moved.
        </p>
        <Link className={`${buttonVariants({ size: "lg" })} mt-7 w-full sm:w-auto`} to={destination}>
          <ActionIcon className="h-4 w-4" aria-hidden="true" />
          {actionLabel}
        </Link>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

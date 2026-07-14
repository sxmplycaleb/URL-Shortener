import { Link } from "react-router-dom";
import { Compass, Home } from "lucide-react";

import { buttonVariants } from "@/components/ui/buttonVariants";
import { Card } from "@/components/ui/card";

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4" id="main-content">
      <Card className="max-w-lg p-8 text-center shadow-soft">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-primary/10">
          <Compass className="h-12 w-12 text-primary" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-3xl font-bold">This short path is off the map.</h1>
        <p className="mt-3 text-muted-foreground">The page may have moved, expired, or never existed.</p>
        <Link className={`${buttonVariants()} mt-6`} to="/">
          <Home className="h-4 w-4" aria-hidden="true" />
          Back home
        </Link>
      </Card>
    </main>
  );
}

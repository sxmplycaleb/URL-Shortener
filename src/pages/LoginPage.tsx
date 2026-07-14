import { Link2 } from "lucide-react";
import { Link } from "react-router-dom";

import { AuthForm } from "@/components/forms/AuthForm";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10" id="main-content">
      <div className="mb-6 flex w-full max-w-md items-center justify-between">
        <Link className="flex items-center gap-2 font-semibold" to="/">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Link2 className="h-5 w-5" aria-hidden="true" />
          </span>
          Shortly
        </Link>
        <ThemeToggle />
      </div>
      <AuthForm mode="login" />
    </main>
  );
}

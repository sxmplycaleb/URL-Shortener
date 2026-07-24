import { Navigate } from "react-router-dom";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { AuthForm } from "@/components/forms/AuthForm";
import { Footer } from "@/components/layout/Footer";
import { getAuthSession } from "@/services/authStorage";

export function RegisterPage() {
  if (getAuthSession()) {
    return <Navigate replace to="/dashboard" />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="grid flex-1 place-items-center px-4 py-10" id="main-content">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <BrandLogo to="/" />
            <ThemeToggle />
          </div>
          <AuthForm mode="register" />
        </div>
      </main>
      <Footer />
    </div>
  );
}

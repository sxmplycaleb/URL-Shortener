import { Navigate } from "react-router-dom";

import { AuthForm } from "@/components/forms/AuthForm";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { getAuthSession } from "@/services/authStorage";

export function RegisterPage() {
  if (getAuthSession()) {
    return <Navigate replace to="/dashboard" />;
  }

  return (
    <AuthLayout
      eyebrow="New workspace"
      title="Create a link command center that feels calm from day one."
      description="Verify your email or phone number, choose a resilient password, and start with a secure account foundation."
    >
      <AuthForm mode="register" />
    </AuthLayout>
  );
}

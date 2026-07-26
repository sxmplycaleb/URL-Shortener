import { useState } from "react";
import { Navigate } from "react-router-dom";

import { AuthForm } from "@/components/forms/AuthForm";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { consumeAuthRedirectMessage, getAuthSession } from "@/services/authStorage";

export function LoginPage() {
  const [redirectMessage] = useState(() => consumeAuthRedirectMessage());

  if (getAuthSession()) {
    return <Navigate replace to="/dashboard" />;
  }

  return (
    <AuthLayout
      eyebrow="Account access"
      title="Get back to your links without losing your rhythm."
      description="Sign in with Google, password, or a one-time code while keeping device trust and recovery options close at hand."
    >
      <AuthForm mode="login" initialMessage={redirectMessage ?? undefined} />
    </AuthLayout>
  );
}

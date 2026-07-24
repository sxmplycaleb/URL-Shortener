import { FormEvent, useId, useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Footer } from "@/components/layout/Footer";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, validatePassword } from "@/lib/utils";
import { getApiErrorMessage } from "@/services/api";
import { resetPassword } from "@/services/auth";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(token ? "" : "Password reset token is missing.");
  const [success, setSuccess] = useState("");
  const errorId = useId();
  const successId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !token) return;

    const form = event.currentTarget;
    const nextPassword = password.trim();
    const nextConfirm = confirm.trim();

    const passwordError = validatePassword(nextPassword);
    if (passwordError) {
      setError(passwordError);
      setSuccess("");
      return;
    }

    if (nextPassword !== nextConfirm) {
      setError("Passwords do not match.");
      setSuccess("");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await resetPassword({ token, password: nextPassword });
      setSuccess(response.message);
      setPassword("");
      setConfirm("");
      form.reset();
    } catch (error) {
      setError(getApiErrorMessage(error, "Unable to reset your password. Please request a new link."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="grid flex-1 place-items-center px-4 py-10" id="main-content">
        <div className="w-full max-w-md">
        <BrandLogo className="mb-6" to="/" />
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Choose a new password</CardTitle>
            <CardDescription>Use a strong password to finish recovering your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" aria-describedby={error ? errorId : success ? successId : undefined} noValidate onSubmit={handleSubmit}>
              {error ? <Alert id={errorId}>{error}</Alert> : null}
              {success ? (
                <Alert className="border-success/30 bg-success/10" id={successId}>
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                    {success}
                  </span>
                </Alert>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <PasswordInput
                  id="password"
                  name="password"
                  value={password}
                  autoComplete="new-password"
                  disabled={loading || !token || Boolean(success)}
                  maxLength={MAX_PASSWORD_LENGTH}
                  minLength={MIN_PASSWORD_LENGTH}
                  showRequirements
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <PasswordInput
                  id="confirm"
                  name="confirm"
                  value={confirm}
                  autoComplete="new-password"
                  disabled={loading || !token || Boolean(success)}
                  maxLength={MAX_PASSWORD_LENGTH}
                  minLength={MIN_PASSWORD_LENGTH}
                  onChange={(event) => setConfirm(event.target.value)}
                  required
                />
              </div>
              <Button className="w-full" disabled={loading || !token || Boolean(success)} type="submit">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Reset password
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Ready to continue?{" "}
              <Link className="font-semibold text-primary hover:underline" to="/login">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}

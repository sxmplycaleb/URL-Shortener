import { FormEvent, useId, useState } from "react";
import { CheckCircle2, Link2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidEmail } from "@/lib/utils";
import { getApiErrorMessage } from "@/services/api";
import { requestPasswordReset } from "@/services/auth";

export function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const errorId = useId();
  const successId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();

    if (!email) {
      setError("Email is required.");
      setSuccess("");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      setSuccess("");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setResetUrl("");

    try {
      const response = await requestPasswordReset({ email });
      setSuccess(response.message);
      setResetUrl(response.resetUrl ?? "");
    } catch (error) {
      setError(getApiErrorMessage(error, "Unable to request a reset link. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10" id="main-content">
      <div className="w-full max-w-md">
        <Link className="mb-6 flex items-center gap-2 font-semibold" to="/">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Link2 className="h-5 w-5" aria-hidden="true" />
          </span>
          Shortly
        </Link>
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>Enter your account email to prepare a secure reset link.</CardDescription>
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
              {resetUrl ? (
                <Alert className="break-all border-success/30 bg-success/10">
                  Development reset link:{" "}
                  <Link className="font-medium text-primary hover:underline" to={new URL(resetUrl).pathname + new URL(resetUrl).search}>
                    {resetUrl}
                  </Link>
                </Alert>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" disabled={loading} inputMode="email" required />
              </div>
              <Button className="w-full" disabled={loading} type="submit">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Send reset link
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Remembered it?{" "}
              <Link className="font-semibold text-primary hover:underline" to="/login">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

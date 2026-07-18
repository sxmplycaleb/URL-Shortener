import { FormEvent, useId, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidEmail, MIN_PASSWORD_LENGTH } from "@/lib/utils";
import { getApiErrorMessage } from "@/services/api";
import { loginUser, registerUser } from "@/services/auth";
import { saveAuthSession } from "@/services/authStorage";

interface AuthFormProps {
  mode: "login" | "register";
  initialMessage?: string | undefined;
}

interface AuthFormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
  form?: string;
}

export function AuthForm({ initialMessage, mode }: AuthFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { message?: string } | null;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [success, setSuccess] = useState(initialMessage ?? locationState?.message ?? "");
  const errorId = useId();
  const successId = useId();
  const isRegister = mode === "register";

  function validate(values: { name: string; email: string; password: string; confirm: string }) {
    const nextErrors: AuthFormErrors = {};

    if (isRegister && !values.name) {
      nextErrors.name = "Name is required.";
    }

    if (!values.email) {
      nextErrors.email = "Email is required.";
    } else if (!isValidEmail(values.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!values.password) {
      nextErrors.password = "Password is required.";
    } else if (values.password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    } else if (isRegister && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(values.password)) {
      nextErrors.password = "Password must include uppercase, lowercase, and numeric characters.";
    }

    if (isRegister && !values.confirm) {
      nextErrors.confirm = "Confirm your password.";
    } else if (isRegister && values.password !== values.confirm) {
      nextErrors.confirm = "Passwords do not match.";
    }

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    const validationErrors = validate({ name, email, password, confirm });

    if (Object.keys(validationErrors).length > 0) {
      setSuccess("");
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSuccess("");
    setLoading(true);

    try {
      if (isRegister) {
        const authSession = await registerUser({ name, email, password });
        saveAuthSession(authSession);
        navigate("/dashboard");
        return;
      }

      const authSession = await loginUser({ email, password });
      saveAuthSession(authSession);
      navigate("/dashboard");
    } catch (error) {
      setErrors({ form: getApiErrorMessage(error, "Unable to reach the authentication service. Please try again.") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-soft">
      <CardHeader>
        <CardTitle>{isRegister ? "Create your workspace" : "Welcome back"}</CardTitle>
        <CardDescription>
          {isRegister ? "Start managing links with ownership and analytics." : "Sign in to manage your short links."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" aria-describedby={errors.form ? errorId : success ? successId : undefined} noValidate onSubmit={handleSubmit}>
          {errors.form ? <Alert id={errorId}>{errors.form}</Alert> : null}
          {success ? (
            <Alert className="border-success/30 bg-success/10" id={successId}>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                {success}
              </span>
            </Alert>
          ) : null}
          {isRegister ? (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ada Lovelace"
                autoComplete="name"
                aria-describedby={errors.name ? "name-error" : undefined}
                aria-invalid={errors.name ? "true" : undefined}
                disabled={loading}
                required
              />
              {errors.name ? (
                <p className="text-sm text-destructive" id="name-error">
                  {errors.name}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              aria-describedby={errors.email ? "email-error" : undefined}
              aria-invalid={errors.email ? "true" : undefined}
              disabled={loading}
              inputMode="email"
              required
            />
            {errors.email ? (
              <p className="text-sm text-destructive" id="email-error">
                {errors.email}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              aria-describedby={errors.password ? "password-error" : undefined}
              aria-invalid={errors.password ? "true" : undefined}
              disabled={loading}
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
            {errors.password ? (
              <p className="text-sm text-destructive" id="password-error">
                {errors.password}
              </p>
            ) : null}
          </div>
          {isRegister ? (
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                aria-describedby={errors.confirm ? "confirm-error" : undefined}
                aria-invalid={errors.confirm ? "true" : undefined}
                disabled={loading}
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
              {errors.confirm ? (
                <p className="text-sm text-destructive" id="confirm-error">
                  {errors.confirm}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex justify-end text-sm">
              <Link className="font-medium text-primary hover:underline" to="/login">
                Forgot password?
              </Link>
            </div>
          )}
          <Button className="w-full" disabled={loading} type="submit">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isRegister ? "Create account" : "Log in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isRegister ? "Already have an account?" : "New to Shortly?"}{" "}
          <Link className="font-semibold text-primary hover:underline" to={isRegister ? "/login" : "/register"}>
            {isRegister ? "Log in" : "Create one"}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

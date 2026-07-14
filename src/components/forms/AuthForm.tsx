import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const errorId = useId();
  const timerRef = useRef<number | undefined>(undefined);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (!email.includes("@") || password.length < 8 || (mode === "register" && password !== confirm)) {
      setError("Check your email and password details before continuing.");
      return;
    }

    setError("");
    setLoading(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setLoading(false), 900);
  }

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const isRegister = mode === "register";

  return (
    <Card className="w-full max-w-md shadow-soft">
      <CardHeader>
        <CardTitle>{isRegister ? "Create your workspace" : "Welcome back"}</CardTitle>
        <CardDescription>
          {isRegister ? "Start managing links with ownership and analytics." : "Sign in to manage your short links."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" aria-describedby={error ? errorId : undefined} noValidate onSubmit={handleSubmit}>
          {error ? <Alert id={errorId}>{error}</Alert> : null}
          {isRegister ? (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Ada Lovelace" autoComplete="name" disabled={loading} required />
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
              aria-describedby={error ? errorId : undefined}
              aria-invalid={error ? "true" : undefined}
              disabled={loading}
              inputMode="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              aria-describedby={error ? errorId : undefined}
              aria-invalid={error ? "true" : undefined}
              disabled={loading}
              minLength={8}
              required
            />
          </div>
          {isRegister ? (
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                aria-describedby={error ? errorId : undefined}
                aria-invalid={error ? "true" : undefined}
                disabled={loading}
                minLength={8}
                required
              />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                <input className="h-4 w-4 rounded border-input" type="checkbox" disabled={loading} />
                Remember me
              </label>
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

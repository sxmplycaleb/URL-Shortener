import { ChangeEvent, FormEvent, useId, useState } from "react";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { MAX_PASSWORD_LENGTH, MIN_NAME_LENGTH, MIN_PASSWORD_LENGTH, validateEmail, validatePassword } from "@/lib/utils";
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

interface AuthFormValues {
  name: string;
  email: string;
  password: string;
  confirm: string;
}

interface AuthToast {
  tone: "success" | "error";
  message: string;
}

const initialValues: AuthFormValues = {
  name: "",
  email: "",
  password: "",
  confirm: "",
};
const SUCCESS_TOAST_DURATION_MS = 600;

function waitForToast() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, SUCCESS_TOAST_DURATION_MS);
  });
}

export function AuthForm({ initialMessage, mode }: AuthFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { message?: string } | null;
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState<AuthFormValues>(initialValues);
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [success, setSuccess] = useState(initialMessage ?? locationState?.message ?? "");
  const [toast, setToast] = useState<AuthToast | null>(
    initialMessage ?? locationState?.message ? { tone: "success", message: initialMessage ?? locationState?.message ?? "" } : null,
  );
  const errorId = useId();
  const successId = useId();
  const isRegister = mode === "register";

  function validate(nextValues: AuthFormValues) {
    const nextErrors: AuthFormErrors = {};
    const trimmedName = nextValues.name.trim();
    const trimmedEmail = nextValues.email.trim();

    if (isRegister && !trimmedName) {
      nextErrors.name = "Name is required.";
    } else if (isRegister && trimmedName.length < MIN_NAME_LENGTH) {
      nextErrors.name = `Name must be at least ${MIN_NAME_LENGTH} characters.`;
    }

    const emailError = validateEmail(trimmedEmail);
    if (emailError) {
      nextErrors.email = emailError;
    }

    if (!nextValues.password) {
      nextErrors.password = "Password is required.";
    } else if (isRegister) {
      const passwordError = validatePassword(nextValues.password);
      if (passwordError) {
        nextErrors.password = passwordError;
      }
    }

    if (isRegister && !nextValues.confirm) {
      nextErrors.confirm = "Confirm your password.";
    } else if (isRegister && nextValues.password !== nextValues.confirm) {
      nextErrors.confirm = "Passwords do not match.";
    }

    return nextErrors;
  }

  function handleChange(field: keyof AuthFormValues) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const nextValues = { ...values, [field]: event.target.value };

      setValues(nextValues);

      if (success) {
        setSuccess("");
      }

      if (errors[field] || errors.form) {
        const nextErrors = validate(nextValues);
        setErrors(nextErrors);
      }
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const trimmedValues = {
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password.trim(),
      confirm: values.confirm.trim(),
    };
    const validationErrors = validate(trimmedValues);

    if (Object.keys(validationErrors).length > 0) {
      setSuccess("");
      setErrors(validationErrors);
      setToast({ tone: "error", message: "Please correct the highlighted fields." });
      return;
    }

    setValues(trimmedValues);
    setErrors({});
    setSuccess("");
    setToast(null);
    setLoading(true);

    try {
      if (isRegister) {
        const authSession = await registerUser({
          name: trimmedValues.name,
          email: trimmedValues.email,
          password: trimmedValues.password,
        });
        saveAuthSession(authSession);
        setToast({ tone: "success", message: "Account created successfully." });
        await waitForToast();
        navigate("/dashboard");
        return;
      }

      const authSession = await loginUser({
        email: trimmedValues.email,
        password: trimmedValues.password,
      });
      saveAuthSession(authSession);
      setToast({ tone: "success", message: "Logged in successfully." });
      await waitForToast();
      navigate("/dashboard");
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to reach the authentication service. Please try again.");
      setErrors({ form: message });
      setToast({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  }

  const fieldClassName = "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive";

  return (
    <Card className="w-full max-w-md shadow-soft">
      <CardHeader>
        <CardTitle>{isRegister ? "Create your workspace" : "Welcome back"}</CardTitle>
        <CardDescription>
          {isRegister ? "Start managing links with ownership and analytics." : "Sign in to manage your short links."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {toast ? (
          <div
            className={`fixed right-4 top-4 z-50 flex max-w-sm items-center gap-2 rounded-md border bg-background px-4 py-3 text-sm shadow-lg ${
              toast.tone === "success" ? "border-success/40 text-foreground" : "border-destructive/40 text-destructive"
            }`}
            role={toast.tone === "error" ? "alert" : "status"}
          >
            {toast.tone === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
            ) : (
              <TriangleAlert className="h-4 w-4" aria-hidden="true" />
            )}
            {toast.message}
          </div>
        ) : null}
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
                value={values.name}
                placeholder="Ada Lovelace"
                autoComplete="name"
                className={fieldClassName}
                aria-describedby={errors.name ? "name-error" : undefined}
                aria-invalid={errors.name ? "true" : undefined}
                disabled={loading}
                onChange={handleChange("name")}
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
              value={values.email}
              placeholder="you@example.com"
              autoComplete="email"
              className={fieldClassName}
              aria-describedby={errors.email ? "email-error" : undefined}
              aria-invalid={errors.email ? "true" : undefined}
              disabled={loading}
              inputMode="email"
              onChange={handleChange("email")}
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
            {isRegister ? (
              <PasswordInput
                id="password"
                name="password"
                value={values.password}
                autoComplete="new-password"
                className={fieldClassName}
                aria-describedby={errors.password ? "password-error" : undefined}
                aria-invalid={errors.password ? "true" : undefined}
                disabled={loading}
                maxLength={MAX_PASSWORD_LENGTH}
                minLength={MIN_PASSWORD_LENGTH}
                showRequirements
                onChange={handleChange("password")}
                required
              />
            ) : (
              <Input
                id="password"
                name="password"
                type="password"
                value={values.password}
                autoComplete="current-password"
                className={fieldClassName}
                aria-describedby={errors.password ? "password-error" : undefined}
                aria-invalid={errors.password ? "true" : undefined}
                disabled={loading}
                minLength={MIN_PASSWORD_LENGTH}
                onChange={handleChange("password")}
                required
              />
            )}
            {errors.password ? (
              <p className="text-sm text-destructive" id="password-error">
                {errors.password}
              </p>
            ) : null}
          </div>
          {isRegister ? (
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <PasswordInput
                id="confirm"
                name="confirm"
                value={values.confirm}
                autoComplete="new-password"
                className={fieldClassName}
                aria-describedby={errors.confirm ? "confirm-error" : undefined}
                aria-invalid={errors.confirm ? "true" : undefined}
                disabled={loading}
                maxLength={MAX_PASSWORD_LENGTH}
                minLength={MIN_PASSWORD_LENGTH}
                onChange={handleChange("confirm")}
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
              <Link className="font-medium text-primary hover:underline" to="/forgot-password">
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

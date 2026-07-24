import { ChangeEvent, FormEvent, useId, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Mail, Phone } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { OTPInput } from "@/components/forms/OTPInput";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  MAX_PASSWORD_LENGTH,
  MIN_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  normalizePhoneNumber,
  validateEmail,
  validatePassword,
  validatePhoneNumber,
} from "@/lib/utils";
import { getApiErrorMessage } from "@/services/api";
import {
  type AuthResponse,
  loginUser,
  loginWithGoogle,
  registerUser,
  requestEmailOtp,
  requestPhoneOtp,
  verifyEmailOtp,
  verifyPhoneOtp,
} from "@/services/auth";
import { saveAuthSession } from "@/services/authStorage";
import { getGoogleIdToken } from "@/services/firebase";
import { getGoogleAuthErrorMessage } from "@/services/googleAuthErrors";

interface AuthFormProps {
  mode: "login" | "register";
  initialMessage?: string | undefined;
}

interface AuthFormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
  phone?: string;
  otp?: string;
  form?: string;
}

interface AuthFormValues {
  name: string;
  email: string;
  password: string;
  confirm: string;
  phone: string;
}

interface AuthToast {
  tone: "success" | "error";
  message: string;
}

type LoginStep = "login-options" | "login-email" | "login-phone" | "login-method" | "login-password" | "login-otp" | "login-phone-otp";
type RegisterStep = "register-form" | "register-otp";
// TODO: Re-enable when Meta WhatsApp Cloud API integration is implemented.
// type PhoneChannel = "sms" | "whatsapp";
type PhoneChannel = "sms";

const initialValues: AuthFormValues = {
  name: "",
  email: "",
  password: "",
  confirm: "",
  phone: "",
};
const SUCCESS_TOAST_DURATION_MS = 600;

function waitForToast() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, SUCCESS_TOAST_DURATION_MS);
  });
}

function isAuthResponse(response: Awaited<ReturnType<typeof verifyEmailOtp>>): response is AuthResponse {
  return "accessToken" in response && "user" in response;
}

export function AuthForm({ initialMessage, mode }: AuthFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { from?: string; message?: string } | null;
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loginStep, setLoginStep] = useState<LoginStep>("login-options");
  const [registerStep, setRegisterStep] = useState<RegisterStep>("register-form");
  const [values, setValues] = useState<AuthFormValues>(initialValues);
  const [otp, setOtp] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [phoneChannel] = useState<PhoneChannel>("sms");
  const [registerVerificationTarget, setRegisterVerificationTarget] = useState<"email" | "phone">("email");
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [success, setSuccess] = useState(initialMessage ?? locationState?.message ?? "");
  const [toast, setToast] = useState<AuthToast | null>(
    initialMessage ?? locationState?.message ? { tone: "success", message: initialMessage ?? locationState?.message ?? "" } : null,
  );
  const errorId = useId();
  const successId = useId();
  const rememberId = useId();
  const isRegister = mode === "register";
  const authenticating = loading || googleLoading;
  const trimmedEmail = values.email.trim().toLowerCase();
  const normalizedPhone = normalizePhoneNumber(values.phone);
  const fieldClassName = "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive";

  function validate(nextValues: AuthFormValues, scope: "email" | "password" | "register") {
    const nextErrors: AuthFormErrors = {};
    const emailError = validateEmail(nextValues.email.trim());

    if (emailError) {
      nextErrors.email = emailError;
    }

    if (scope === "password" || scope === "register") {
      if (!nextValues.password) {
        nextErrors.password = "Password is required.";
      } else if (scope === "register") {
        const passwordError = validatePassword(nextValues.password);
        if (passwordError) {
          nextErrors.password = passwordError;
        }
      }
    }

    if (scope === "register") {
      const name = nextValues.name.trim();
      if (!name) {
        nextErrors.name = "Name is required.";
      } else if (name.length < MIN_NAME_LENGTH) {
        nextErrors.name = `Name must be at least ${MIN_NAME_LENGTH} characters.`;
      }

      if (!nextValues.confirm) {
        nextErrors.confirm = "Confirm your password.";
      } else if (nextValues.password !== nextValues.confirm) {
        nextErrors.confirm = "Passwords do not match.";
      }
    }

    return nextErrors;
  }

  function handleChange(field: keyof AuthFormValues) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const nextValues = { ...values, [field]: event.target.value };

      setValues(nextValues);
      setSuccess("");

      if (errors[field] || errors.form) {
        setErrors({});
      }
    };
  }

  function showValidationErrors(nextErrors: AuthFormErrors) {
    setSuccess("");
    setErrors(nextErrors);
    setToast({ tone: "error", message: "Please correct the highlighted fields." });
  }

  async function finishWithSession(authSession: AuthResponse, message: string) {
    saveAuthSession(authSession);
    setToast({ tone: "success", message });
    await waitForToast();
    navigate(locationState?.from ?? "/dashboard");
  }

  async function handleGoogleSignIn() {
    if (authenticating) return;

    setErrors({});
    setSuccess("");
    setToast(null);
    setGoogleLoading(true);

    try {
      const idToken = await getGoogleIdToken();
      const authSession = await loginWithGoogle({ idToken, rememberDevice: !isRegister && rememberDevice });
      await finishWithSession(authSession, isRegister ? "Google account connected. Welcome to Shortly." : "Logged in with Google.");
    } catch (error) {
      const message = getGoogleAuthErrorMessage(error);
      setErrors({ form: message });
      setToast({ tone: "error", message });
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleLoginEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authenticating) return;

    const validationErrors = validate(values, "email");
    if (Object.keys(validationErrors).length > 0) {
      showValidationErrors(validationErrors);
      return;
    }

    setValues((current) => ({ ...current, email: trimmedEmail }));
    setErrors({});
    setToast(null);
    setLoginStep("login-method");
  }

  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authenticating) return;

    const validationErrors = validate(values, "password");
    if (Object.keys(validationErrors).length > 0) {
      showValidationErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});
    setToast(null);

    try {
      const authSession = await loginUser({ email: trimmedEmail, password: values.password, rememberDevice });
      await finishWithSession(authSession, "Logged in successfully.");
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to reach the authentication service. Please try again.");
      setErrors({ form: message });
      setToast({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  }

  async function requestOtpCode(purpose: "LOGIN" | "REGISTER" | "RESET_PASSWORD" = isRegister ? "REGISTER" : "LOGIN") {
    const validationErrors = validate(values, "email");
    if (Object.keys(validationErrors).length > 0) {
      showValidationErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});
    setOtp("");
    setToast(null);

    try {
      const response = await requestEmailOtp({ email: trimmedEmail, purpose });
      setSuccess(response.otp ? `Development code: ${response.otp}` : "We sent a one-time code to your email.");
      if (purpose === "LOGIN") {
        setLoginStep("login-otp");
      } else {
        setRegisterStep("register-otp");
      }
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to send a verification code. Please try again.");
      setErrors({ form: message });
      setToast({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  }

  async function requestPhoneOtpCode(purpose: "LOGIN" | "REGISTER" | "RESET_PASSWORD" = isRegister ? "REGISTER" : "LOGIN") {
    const phoneError = validatePhoneNumber(values.phone);
    if (phoneError) {
      showValidationErrors({ phone: phoneError });
      return;
    }

    setLoading(true);
    setErrors({});
    setOtp("");
    setToast(null);

    try {
      const response = await requestPhoneOtp({ phone: normalizedPhone, purpose, channel: phoneChannel });
      // TODO: Re-enable when Meta WhatsApp Cloud API integration is implemented.
      // const channelLabel = phoneChannel === "whatsapp" ? "WhatsApp" : "SMS";
      const channelLabel = "SMS";
      setSuccess(response.otp ? `Development code: ${response.otp}` : `We sent a one-time code by ${channelLabel}.`);
      if (purpose === "LOGIN") {
        setLoginStep("login-phone-otp");
      } else {
        setRegisterVerificationTarget("phone");
        setRegisterStep("register-otp");
      }
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to send a phone verification code. Please try again.");
      setErrors({ form: message });
      setToast({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpVerification(code = otp) {
    if (loading || code.length !== 6) return;

    setLoading(true);
    setErrors({});
    setToast(null);

    try {
      const purpose = isRegister ? "REGISTER" : "LOGIN";
      const response = await verifyEmailOtp({
        email: trimmedEmail,
        purpose,
        otp: code,
        rememberDevice: !isRegister && rememberDevice,
      });

      if (!isRegister) {
        if (!isAuthResponse(response)) {
          throw new Error("OTP login did not return an authenticated session.");
        }
        await finishWithSession(response, "Logged in with a one-time code.");
        return;
      }

      const authSession = await registerUser({
        name: values.name.trim(),
        email: trimmedEmail,
        password: values.password,
      });
      await finishWithSession(authSession, "Email verified. Account created successfully.");
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to verify that code. Please try again.");
      setErrors({ otp: message });
      setToast({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  }

  async function handlePhoneOtpVerification(code = otp) {
    if (loading || code.length !== 6) return;

    setLoading(true);
    setErrors({});
    setToast(null);

    try {
      const purpose = isRegister ? "REGISTER" : "LOGIN";
      const response = await verifyPhoneOtp({
        phone: normalizedPhone,
        purpose,
        channel: phoneChannel,
        otp: code,
        rememberDevice: !isRegister && rememberDevice,
      });

      if (!isRegister) {
        if (!isAuthResponse(response)) {
          throw new Error("Phone OTP login did not return an authenticated session.");
        }
        await finishWithSession(response, "Logged in with a phone code.");
        return;
      }

      const authSession = await registerUser({
        name: values.name.trim(),
        email: trimmedEmail,
        password: values.password,
        phone: normalizedPhone,
      });
      await finishWithSession(authSession, "Phone verified. Account created successfully.");
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to verify that code. Please try again.");
      setErrors({ otp: message });
      setToast({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  }

  async function handleRegistrationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authenticating) return;

    const trimmedValues = {
      name: values.name.trim(),
      email: trimmedEmail,
      password: values.password.trim(),
      confirm: values.confirm.trim(),
      phone: values.phone.trim(),
    };
    const validationErrors = validate(trimmedValues, "register");

    if (Object.keys(validationErrors).length > 0) {
      showValidationErrors(validationErrors);
      return;
    }

    setValues(trimmedValues);
    if (trimmedValues.phone) {
      await requestPhoneOtpCode("REGISTER");
      return;
    }

    await requestOtpCode("REGISTER");
  }

  function renderToast() {
    return toast && toast.tone === "success" ? (
      <div
        className="fixed right-4 top-4 z-50 flex max-w-sm items-center gap-2 rounded-md border border-success/40 bg-background px-4 py-3 text-sm text-foreground shadow-lg"
        role="status"
      >
        <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
        {toast.message}
      </div>
    ) : null;
  }

  function renderMessages() {
    return (
      <>
        {errors.form ? <Alert id={errorId}>{errors.form}</Alert> : null}
        {success ? (
          <Alert className="border-success/30 bg-success/10" id={successId}>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
              {success}
            </span>
          </Alert>
        ) : null}
      </>
    );
  }

  function renderGoogleButton() {
    return (
      <Button
        className="w-full border-input bg-background text-foreground hover:bg-muted"
        disabled={authenticating}
        type="button"
        variant="outline"
        aria-label={isRegister ? "Continue registering with Google" : "Continue logging in with Google"}
        onClick={() => void handleGoogleSignIn()}
      >
        {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <GoogleIcon />}
        Continue with Google
      </Button>
    );
  }

  function renderDivider() {
    return (
      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        OR
        <span className="h-px flex-1 bg-border" />
      </div>
    );
  }

  function renderEmailField(disabled = authenticating) {
    return (
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
          disabled={disabled}
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
    );
  }

  function renderPhoneField(disabled = authenticating, required = true) {
    return (
      <div className="space-y-2">
        <Label htmlFor="phone">{required ? "Phone number" : "Phone number (optional)"}</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={values.phone}
          placeholder="+15551234567"
          autoComplete="tel"
          className={fieldClassName}
          aria-describedby={errors.phone ? "phone-error" : undefined}
          aria-invalid={errors.phone ? "true" : undefined}
          disabled={disabled}
          inputMode="tel"
          onChange={handleChange("phone")}
          required={required}
        />
        {errors.phone ? (
          <p className="text-sm text-destructive" id="phone-error">
            {errors.phone}
          </p>
        ) : null}
      </div>
    );
  }

  function renderPhoneChannelPicker() {
    /*
      TODO: Re-enable when Meta WhatsApp Cloud API integration is implemented.
      return (
        <div className="grid grid-cols-2 gap-2">
          <Button disabled={authenticating} type="button" variant={phoneChannel === "sms" ? "default" : "outline"} onClick={() => setPhoneChannel("sms")}>
            SMS
          </Button>
          <Button disabled={authenticating} type="button" variant={phoneChannel === "whatsapp" ? "default" : "outline"} onClick={() => setPhoneChannel("whatsapp")}>
            WhatsApp
          </Button>
        </div>
      );
    */
    return null;
  }

  function renderPasswordField(autoComplete: "current-password" | "new-password") {
    return (
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        {autoComplete === "new-password" ? (
          <PasswordInput
            id="password"
            name="password"
            value={values.password}
            autoComplete="new-password"
            className={fieldClassName}
            aria-describedby={errors.password ? "password-error" : undefined}
            aria-invalid={errors.password ? "true" : undefined}
            disabled={authenticating}
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
            disabled={authenticating}
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
    );
  }

  function renderLoginContent() {
    if (loginStep === "login-options") {
      return (
        <div className="space-y-4">
          {renderGoogleButton()}
          {renderDivider()}
          <Button className="w-full" disabled={authenticating} type="button" variant="outline" onClick={() => setLoginStep("login-email")}>
            <Mail className="h-4 w-4" aria-hidden="true" />
            Continue with Email
          </Button>
          <Button className="w-full" disabled={authenticating} type="button" variant="outline" onClick={() => setLoginStep("login-phone")}>
            <Phone className="h-4 w-4" aria-hidden="true" />
            Continue with Phone Number
          </Button>
        </div>
      );
    }

    if (loginStep === "login-email") {
      return (
        <form className="space-y-4" noValidate onSubmit={handleLoginEmailSubmit}>
          {renderEmailField()}
          <Button className="w-full" disabled={authenticating} type="submit">
            Continue
          </Button>
        </form>
      );
    }

    if (loginStep === "login-phone") {
      return (
        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void requestPhoneOtpCode("LOGIN");
          }}
        >
          {renderPhoneField()}
          {renderPhoneChannelPicker()}
          <Button className="w-full" disabled={authenticating} type="submit">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Send phone code
          </Button>
        </form>
      );
    }

    if (loginStep === "login-method") {
      return (
        <div className="space-y-4">
          <Alert className="border-success/30 bg-success/10">Continue as {trimmedEmail}.</Alert>
          <Button className="w-full" disabled={authenticating} type="button" onClick={() => setLoginStep("login-password")}>
            Sign in with Password
          </Button>
          <Button className="w-full" disabled={authenticating} type="button" variant="outline" onClick={() => void requestOtpCode("LOGIN")}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Sign in with One-Time Code
          </Button>
        </div>
      );
    }

    if (loginStep === "login-password") {
      return (
        <form className="space-y-4" noValidate onSubmit={handlePasswordLogin}>
          {renderEmailField(true)}
          {renderPasswordField("current-password")}
          <div className="flex justify-end text-sm">
            <Link className="font-medium text-primary hover:underline" to="/forgot-password">
              Forgot password?
            </Link>
          </div>
          <label className="flex items-start gap-2 text-sm text-muted-foreground" htmlFor={rememberId}>
            <input
              id={rememberId}
              checked={rememberDevice}
              className="mt-1 h-4 w-4 rounded border-input accent-primary"
              disabled={loading}
              type="checkbox"
              onChange={(event) => setRememberDevice(event.target.checked)}
            />
            <span>Remember this device</span>
          </label>
          <Button className="w-full" disabled={authenticating} type="submit">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Log in
          </Button>
        </form>
      );
    }

    if (loginStep === "login-otp") {
      return (
        <div className="space-y-4">
          <OTPInput
            destination={trimmedEmail}
            error={errors.otp}
            loading={loading}
            value={otp}
            onChange={setOtp}
            onComplete={(code) => void handleOtpVerification(code)}
            onResend={() => requestOtpCode("LOGIN")}
          />
          <label className="flex items-start gap-2 text-sm text-muted-foreground" htmlFor={rememberId}>
            <input
              id={rememberId}
              checked={rememberDevice}
              className="mt-1 h-4 w-4 rounded border-input accent-primary"
              disabled={loading}
              type="checkbox"
              onChange={(event) => setRememberDevice(event.target.checked)}
            />
            <span>Remember this device</span>
          </label>
          <Button className="w-full" disabled={loading || otp.length !== 6} type="button" onClick={() => void handleOtpVerification()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Verify and log in
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <OTPInput
          destination={normalizedPhone}
          error={errors.otp}
          loading={loading}
          value={otp}
          onChange={setOtp}
          onComplete={(code) => void handlePhoneOtpVerification(code)}
          onResend={() => requestPhoneOtpCode("LOGIN")}
        />
        <label className="flex items-start gap-2 text-sm text-muted-foreground" htmlFor={rememberId}>
          <input
            id={rememberId}
            checked={rememberDevice}
            className="mt-1 h-4 w-4 rounded border-input accent-primary"
            disabled={loading}
            type="checkbox"
            onChange={(event) => setRememberDevice(event.target.checked)}
          />
          <span>Remember this device</span>
        </label>
        <Button className="w-full" disabled={loading || otp.length !== 6} type="button" onClick={() => void handlePhoneOtpVerification()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Verify and log in
        </Button>
      </div>
    );
  }

  function renderRegisterContent() {
    if (registerStep === "register-otp") {
      return (
        <div className="space-y-4">
          <OTPInput
            destination={registerVerificationTarget === "phone" ? normalizedPhone : trimmedEmail}
            error={errors.otp}
            loading={loading}
            value={otp}
            onChange={setOtp}
            onComplete={(code) =>
              registerVerificationTarget === "phone"
                ? void handlePhoneOtpVerification(code)
                : void handleOtpVerification(code)
            }
            onResend={() =>
              registerVerificationTarget === "phone" ? requestPhoneOtpCode("REGISTER") : requestOtpCode("REGISTER")
            }
          />
          <Button
            className="w-full"
            disabled={loading || otp.length !== 6}
            type="button"
            onClick={() =>
              registerVerificationTarget === "phone" ? void handlePhoneOtpVerification() : void handleOtpVerification()
            }
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Verify and create account
          </Button>
        </div>
      );
    }

    return (
      <>
        {renderGoogleButton()}
        {renderDivider()}
        <form className="space-y-4" noValidate onSubmit={handleRegistrationSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={values.name}
              placeholder="Caleb Ongau"
              autoComplete="name"
              className={fieldClassName}
              aria-describedby={errors.name ? "name-error" : undefined}
              aria-invalid={errors.name ? "true" : undefined}
              disabled={authenticating}
              onChange={handleChange("name")}
              required
            />
            {errors.name ? (
              <p className="text-sm text-destructive" id="name-error">
                {errors.name}
              </p>
            ) : null}
          </div>
          {renderEmailField()}
          <div className="space-y-3">
            {renderPhoneField(false, false)}
            {renderPhoneChannelPicker()}
          </div>
          {renderPasswordField("new-password")}
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
              disabled={authenticating}
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
          <Button className="w-full" disabled={authenticating} type="submit">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Create account
          </Button>
        </form>
      </>
    );
  }

  const canGoBack =
    (!isRegister && loginStep !== "login-options") || (isRegister && registerStep !== "register-form");

  return (
    <Card className="w-full max-w-md shadow-soft">
      <CardHeader>
        {canGoBack ? (
          <Button
            className="mb-2 w-fit px-0 text-muted-foreground"
            disabled={authenticating}
            type="button"
            variant="ghost"
            onClick={() => {
              setErrors({});
              setSuccess("");
              if (isRegister) {
                setRegisterStep("register-form");
              } else if (loginStep === "login-method") {
                setLoginStep("login-email");
              } else if (loginStep === "login-phone-otp") {
                setLoginStep("login-phone");
              } else if (loginStep === "login-email") {
                setLoginStep("login-options");
              } else if (loginStep === "login-phone") {
                setLoginStep("login-options");
              } else {
                setLoginStep("login-method");
              }
            }}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </Button>
        ) : null}
        <CardTitle>{isRegister ? "Create your workspace" : "Welcome back"}</CardTitle>
        <CardDescription>
          {isRegister ? "Verify your email before activating your account." : "Sign in to manage your short links."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderToast()}
        <div className="space-y-4" aria-describedby={errors.form ? errorId : success ? successId : undefined}>
          {renderMessages()}
          {isRegister ? renderRegisterContent() : renderLoginContent()}
        </div>
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

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.52Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.44l-3.24-2.51c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.76-5.58-4.12H3.07v2.59A9.99 9.99 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.42 13.88a6.01 6.01 0 0 1 0-3.76V7.53H3.07a9.99 9.99 0 0 0 0 8.94l3.35-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 6c1.47 0 2.8.51 3.84 1.5l2.86-2.86A9.6 9.6 0 0 0 12 2a9.99 9.99 0 0 0-8.93 5.53l3.35 2.59C7.2 7.76 9.4 6 12 6Z"
      />
    </svg>
  );
}

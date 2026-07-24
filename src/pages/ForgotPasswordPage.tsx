import { FormEvent, useId, useState } from "react";
import { CheckCircle2, Link2, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { OTPInput } from "@/components/forms/OTPInput";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizePhoneNumber, validateEmail, validatePhoneNumber } from "@/lib/utils";
import { getApiErrorMessage } from "@/services/api";
import { requestEmailOtp, requestPasswordReset, requestPhoneOtp, verifyEmailOtp, verifyPhoneOtp } from "@/services/auth";

type ResetMode = "link" | "email-otp" | "phone-otp";
type OtpStep = "target" | "code";
// TODO: Re-enable when Meta WhatsApp Cloud API integration is implemented.
// type PhoneChannel = "sms" | "whatsapp";
type PhoneChannel = "sms";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ResetMode>("link");
  const [otpStep, setOtpStep] = useState<OtpStep>("target");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneChannel] = useState<PhoneChannel>("sms");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const errorId = useId();
  const successId = useId();

  function normalizedEmail() {
    return email.trim().toLowerCase();
  }

  function normalizedPhone() {
    return normalizePhoneNumber(phone);
  }

  function validateSubmittedEmail() {
    const emailError = validateEmail(normalizedEmail());
    if (emailError) {
      setError(emailError);
      setSuccess("");
      return false;
    }

    return true;
  }

  async function handleLinkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !validateSubmittedEmail()) return;

    setLoading(true);
    setError("");
    setSuccess("");
    setResetUrl("");

    try {
      const response = await requestPasswordReset({ email: normalizedEmail() });
      setSuccess(response.message);
      setResetUrl(response.resetUrl ?? "");
    } catch (error) {
      setError(getApiErrorMessage(error, "Unable to request a reset link. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function requestResetOtp() {
    if (loading || !validateSubmittedEmail()) return;

    setLoading(true);
    setError("");
    setOtpError("");
    setOtp("");
    setSuccess("");

    try {
      const response = await requestEmailOtp({ email: normalizedEmail(), purpose: "RESET_PASSWORD" });
      setSuccess(response.otp ? `Development code: ${response.otp}` : "We sent a reset code to your email.");
      setOtpStep("code");
    } catch (error) {
      setError(getApiErrorMessage(error, "Unable to send a reset code. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function requestPhoneResetOtp() {
    if (loading) return;

    const phoneError = validatePhoneNumber(phone);
    if (phoneError) {
      setError(phoneError);
      setSuccess("");
      return;
    }

    setLoading(true);
    setError("");
    setOtpError("");
    setOtp("");
    setSuccess("");

    try {
      const response = await requestPhoneOtp({
        phone: normalizedPhone(),
        purpose: "RESET_PASSWORD",
        channel: phoneChannel,
      });
      // TODO: Re-enable when Meta WhatsApp Cloud API integration is implemented.
      // const channelLabel = phoneChannel === "whatsapp" ? "WhatsApp" : "SMS";
      const channelLabel = "SMS";
      setSuccess(response.otp ? `Development code: ${response.otp}` : `We sent a reset code by ${channelLabel}.`);
      setOtpStep("code");
    } catch (error) {
      setError(getApiErrorMessage(error, "Unable to send a reset code. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function verifyResetOtp(code = otp) {
    if (loading || code.length !== 6) return;

    setLoading(true);
    setError("");
    setOtpError("");

    try {
      const response = await verifyEmailOtp({
        email: normalizedEmail(),
        purpose: "RESET_PASSWORD",
        otp: code,
      });

      if (!("resetUrl" in response) || !response.resetUrl) {
        throw new Error("Reset OTP did not return a reset URL.");
      }

      const reset = new URL(response.resetUrl);
      navigate(`${reset.pathname}${reset.search}`, {
        state: { message: response.message ?? "Verification complete. Choose a new password." },
      });
    } catch (error) {
      setOtpError(getApiErrorMessage(error, "Unable to verify that code. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function verifyPhoneResetOtp(code = otp) {
    if (loading || code.length !== 6) return;

    setLoading(true);
    setError("");
    setOtpError("");

    try {
      const response = await verifyPhoneOtp({
        phone: normalizedPhone(),
        purpose: "RESET_PASSWORD",
        channel: phoneChannel,
        otp: code,
      });

      if (!("resetUrl" in response) || !response.resetUrl) {
        throw new Error("Phone reset OTP did not return a reset URL.");
      }

      const reset = new URL(response.resetUrl);
      navigate(`${reset.pathname}${reset.search}`, {
        state: { message: response.message ?? "Verification complete. Choose a new password." },
      });
    } catch (error) {
      setOtpError(getApiErrorMessage(error, "Unable to verify that code. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  function renderModeButton(nextMode: ResetMode, label: string) {
    return (
      <Button
        className="w-full"
        disabled={loading}
        type="button"
        variant={mode === nextMode ? "default" : "outline"}
        onClick={() => {
          setMode(nextMode);
          setError("");
          setOtpError("");
          setSuccess("");
          setResetUrl("");
          setOtpStep("target");
        }}
      >
        {label}
      </Button>
    );
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
            <CardDescription>Choose a reset link, email code, or phone code.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {renderModeButton("link", "Email link")}
              {renderModeButton("email-otp", "Email code")}
              {renderModeButton("phone-otp", "Phone code")}
            </div>
            <div className="space-y-4" aria-describedby={error ? errorId : success ? successId : undefined}>
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
              {mode === "link" ? (
                <form className="space-y-4" noValidate onSubmit={handleLinkSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      autoComplete="email"
                      disabled={loading}
                      inputMode="email"
                      required
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                  <Button className="w-full" disabled={loading} type="submit">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                    Send reset link
                  </Button>
                </form>
              ) : mode === "email-otp" && otpStep === "target" ? (
                <form
                  className="space-y-4"
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    void requestResetOtp();
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="otp-email">Email</Label>
                    <Input
                      id="otp-email"
                      name="email"
                      type="email"
                      value={email}
                      autoComplete="email"
                      disabled={loading}
                      inputMode="email"
                      required
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                  <Button className="w-full" disabled={loading} type="submit">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                    Send reset code
                  </Button>
                </form>
              ) : mode === "phone-otp" && otpStep === "target" ? (
                <form
                  className="space-y-4"
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    void requestPhoneResetOtp();
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="otp-phone">Phone number</Label>
                    <Input
                      id="otp-phone"
                      name="phone"
                      type="tel"
                      value={phone}
                      autoComplete="tel"
                      disabled={loading}
                      inputMode="tel"
                      placeholder="+15551234567"
                      required
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </div>
                  {/* TODO: Re-enable when Meta WhatsApp Cloud API integration is implemented. */}
                  {/* <div className="grid grid-cols-2 gap-2">
                    <Button disabled={loading} type="button" variant={phoneChannel === "sms" ? "default" : "outline"} onClick={() => setPhoneChannel("sms")}>
                      SMS
                    </Button>
                    <Button disabled={loading} type="button" variant={phoneChannel === "whatsapp" ? "default" : "outline"} onClick={() => setPhoneChannel("whatsapp")}>
                      WhatsApp
                    </Button>
                  </div> */}
                  <Button className="w-full" disabled={loading} type="submit">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                    Send reset code
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <OTPInput
                    destination={mode === "phone-otp" ? normalizedPhone() : normalizedEmail()}
                    error={otpError}
                    loading={loading}
                    value={otp}
                    onChange={setOtp}
                    onComplete={(code) => (mode === "phone-otp" ? void verifyPhoneResetOtp(code) : void verifyResetOtp(code))}
                    onResend={mode === "phone-otp" ? requestPhoneResetOtp : requestResetOtp}
                  />
                  <Button
                    className="w-full"
                    disabled={loading || otp.length !== 6}
                    type="button"
                    onClick={() => (mode === "phone-otp" ? void verifyPhoneResetOtp() : void verifyResetOtp())}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                    Verify reset code
                  </Button>
                </div>
              )}
            </div>
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

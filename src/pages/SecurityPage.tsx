import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Globe2,
  KeyRound,
  Laptop,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Trash2,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Switch } from "@/components/ui/switch";
import { Table, Td, Th } from "@/components/ui/table";
import { cn, validatePassword as validateStrongPassword } from "@/lib/utils";
import { getApiErrorMessage, isAuthorizationError } from "@/services/api";
import { updatePassword } from "@/services/account";
import { clearAuthSession, getAuthSession, saveAuthSession } from "@/services/authStorage";
import {
  getSecurityCenter,
  removeTrustedDevice,
  revokeOtherSessions,
  revokeSession,
  updateSecuritySettings,
  type LoginHistoryEntry,
  type SecurityCenterResponse,
  type SecuritySession,
} from "@/services/security";

type NoticeTone = "success" | "error";

interface Notice {
  tone: NoticeTone;
  message: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const methodLabels: Record<LoginHistoryEntry["method"], string> = {
  email_password: "Email/Password",
  email_otp: "Email OTP",
  sms_otp: "SMS OTP",
  google: "Google",
};

function formatDate(value?: string | null) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function FieldError({ children, id }: { children: string | undefined; id: string }) {
  if (!children) return null;
  return (
    <p className="text-sm text-destructive" id={id}>
      {children}
    </p>
  );
}

export function SecurityPage() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const accessToken = session?.accessToken ?? "";
  const [security, setSecurity] = useState<SecurityCenterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [currentSessionToRevoke, setCurrentSessionToRevoke] = useState<SecuritySession | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [passwords, setPasswords] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});

  const settings = security?.securitySettings;
  const activeSessionCount = security?.sessions.length ?? 0;
  const trustedDeviceCount = security?.trustedDevices.length ?? 0;
  const failedLoginCount = useMemo(
    () => security?.loginHistory.filter((entry) => entry.status === "failed").length ?? 0,
    [security?.loginHistory],
  );
  const emailVerified = session?.user.emailVerified ?? session?.user.isVerified ?? false;
  const phoneVerified = settings?.phoneVerified ?? session?.user.phoneVerified ?? false;
  const twoFactorEnabled = Boolean(settings?.emailOtpEnabled || settings?.smsOtpEnabled);
  const securityScore = useMemo(() => {
    if (!security) return 0;
    return (
      (emailVerified ? 20 : 0) +
      (phoneVerified ? 15 : 0) +
      (settings?.googleLinked ? 15 : 0) +
      (twoFactorEnabled ? 20 : 0) +
      (activeSessionCount <= 1 ? 15 : 8) +
      (failedLoginCount === 0 ? 15 : 5)
    );
  }, [activeSessionCount, emailVerified, failedLoginCount, phoneVerified, security, settings?.googleLinked, twoFactorEnabled]);
  const scoreTone = securityScore >= 80 ? "Strong" : securityScore >= 55 ? "Needs attention" : "At risk";
  const protectionItems = [
    {
      label: "Email Verification",
      description: emailVerified ? "Your recovery email is verified." : "Verify your email to secure recovery.",
      enabled: emailVerified,
      icon: Mail,
    },
    {
      label: "Phone Verification",
      description: phoneVerified ? "Your phone can support recovery." : "Add and verify a phone for recovery.",
      enabled: phoneVerified,
      icon: Phone,
    },
    {
      label: "2FA",
      description: twoFactorEnabled ? "One-time passcodes are enabled." : "Turn on email or SMS OTP.",
      enabled: twoFactorEnabled,
      icon: ShieldCheck,
    },
    {
      label: "Google Account",
      description: settings?.googleLinked
        ? `Linked${settings.googleLinkedAt ? ` ${formatDate(settings.googleLinkedAt)}` : ""}.`
        : "Google sign-in is not linked.",
      enabled: settings?.googleLinked ?? false,
      icon: Globe2,
    },
  ];

  const endSession = useCallback((message = "Your session expired. Please log in again.") => {
    clearAuthSession(message);
    navigate("/login", { replace: true, state: { message } });
  }, [navigate]);

  function showNotice(nextNotice: Notice) {
    setNotice(nextNotice);
    window.setTimeout(() => setNotice(null), 3500);
  }

  const loadSecurity = useCallback(async () => {
    setLoading(true);
    try {
      setSecurity(await getSecurityCenter(accessToken));
    } catch (error) {
      if (isAuthorizationError(error)) {
        endSession();
        return;
      }
      showNotice({ tone: "error", message: getApiErrorMessage(error, "Unable to load security details.") });
    } finally {
      setLoading(false);
    }
  }, [accessToken, endSession]);

  useEffect(() => {
    void loadSecurity();
  }, [loadSecurity]);

  function validatePassword() {
    const nextErrors: PasswordErrors = {};
    if (!passwords.currentPassword) nextErrors.currentPassword = "Current password is required.";
    if (!passwords.newPassword) {
      nextErrors.newPassword = "New password is required.";
    } else {
      const passwordError = validateStrongPassword(passwords.newPassword);
      if (passwordError) nextErrors.newPassword = passwordError;
    }
    if (!passwords.confirmPassword) {
      nextErrors.confirmPassword = "Confirm your new password.";
    } else if (passwords.confirmPassword !== passwords.newPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    return nextErrors;
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validatePassword();
    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showNotice({ tone: "error", message: "Fix the highlighted password fields." });
      return;
    }

    setBusyAction("password");
    try {
      await updatePassword(accessToken, {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showNotice({ tone: "success", message: "Password updated." });
    } catch (error) {
      if (isAuthorizationError(error)) {
        endSession();
        return;
      }
      showNotice({ tone: "error", message: getApiErrorMessage(error, "Unable to update password.") });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRevokeSession(sessionToRevoke: SecuritySession, confirmCurrent = false) {
    setBusyAction(sessionToRevoke.id);
    try {
      const response = await revokeSession(accessToken, sessionToRevoke.id, confirmCurrent);
      if (response.revokedCurrent) {
        clearAuthSession("That session has been revoked. Please log in again.");
        navigate("/login", { replace: true, state: { message: "That session has been revoked. Please log in again." } });
        return;
      }
      setSecurity((current) =>
        current
          ? {
              ...current,
              sessions: current.sessions.filter((securitySession) => securitySession.id !== sessionToRevoke.id),
            }
          : current,
      );
      showNotice({ tone: "success", message: "Session revoked." });
    } catch (error) {
      if (isAuthorizationError(error)) {
        endSession();
        return;
      }
      showNotice({ tone: "error", message: getApiErrorMessage(error, "Unable to revoke session.") });
    } finally {
      setBusyAction(null);
      setCurrentSessionToRevoke(null);
    }
  }

  async function handleRevokeOthers() {
    setBusyAction("others");
    try {
      const response = await revokeOtherSessions(accessToken);
      setSecurity((current) =>
        current
          ? {
              ...current,
              sessions: current.sessions.filter((securitySession) => securitySession.current),
            }
          : current,
      );
      showNotice({ tone: "success", message: `${response.revokedCount} other session${response.revokedCount === 1 ? "" : "s"} revoked.` });
    } catch (error) {
      if (isAuthorizationError(error)) {
        endSession();
        return;
      }
      showNotice({ tone: "error", message: getApiErrorMessage(error, "Unable to revoke sessions.") });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRemoveTrustedDevice(deviceId: string) {
    setBusyAction(deviceId);
    try {
      await removeTrustedDevice(accessToken, deviceId);
      setSecurity((current) =>
        current
          ? {
              ...current,
              trustedDevices: current.trustedDevices.filter((device) => device.id !== deviceId),
            }
          : current,
      );
      showNotice({ tone: "success", message: "Trusted device removed." });
    } catch (error) {
      if (isAuthorizationError(error)) {
        endSession();
        return;
      }
      showNotice({ tone: "error", message: getApiErrorMessage(error, "Unable to remove trusted device.") });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSecuritySettingChange(field: "emailOtpEnabled" | "smsOtpEnabled") {
    if (!security || busyAction === "settings") return;

    const nextSettings = {
      emailOtpEnabled: security.securitySettings.emailOtpEnabled,
      smsOtpEnabled: security.securitySettings.smsOtpEnabled,
      [field]: !security.securitySettings[field],
    };
    setSecurity({ ...security, securitySettings: { ...security.securitySettings, ...nextSettings } });
    setBusyAction("settings");

    try {
      const response = await updateSecuritySettings(accessToken, nextSettings);
      saveAuthSession({ accessToken: getAuthSession()?.accessToken ?? accessToken, user: response.user });
      showNotice({ tone: "success", message: "Security settings saved." });
    } catch (error) {
      setSecurity(security);
      if (isAuthorizationError(error)) {
        endSession();
        return;
      }
      showNotice({ tone: "error", message: getApiErrorMessage(error, "Unable to save security settings.") });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="overflow-hidden rounded-lg border bg-card shadow-xs">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,0.92fr)_minmax(360px,1.08fr)]">
          <div className="border-b bg-background/70 p-6 sm:p-8 xl:border-b-0 xl:border-r">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Google Account inspired
                </p>
                <h1 className="text-title-1">Security Center</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Review the protections, devices, sessions, and sign-in activity connected to your account.
                </p>
              </div>
              <Button disabled={loading || busyAction === "others"} variant="outline" onClick={() => void handleRevokeOthers()}>
                {busyAction === "others" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                Revoke other sessions
              </Button>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
              <SecurityScore score={securityScore} loading={loading} />
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Security Score</p>
                  <p className="text-title-2">{loading ? "Checking..." : scoreTone}</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-slow",
                      securityScore >= 80 ? "bg-success" : securityScore >= 55 ? "bg-warning" : "bg-destructive",
                    )}
                    style={{ width: `${loading ? 0 : securityScore}%` }}
                  />
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {failedLoginCount > 0
                    ? `${failedLoginCount} failed login ${failedLoginCount === 1 ? "attempt needs" : "attempts need"} review.`
                    : "No failed login attempts in recent activity."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-0 sm:grid-cols-2">
            {protectionItems.map((item) => (
              <ProtectionCard key={item.label} {...item} loading={loading} />
            ))}
          </div>
        </div>
      </section>

      {notice ? (
        <Alert
          className={cn(
            notice.tone === "success" ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10",
          )}
        >
          {notice.message}
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={Laptop} label="Active Sessions" value={activeSessionCount} detail="Signed-in browsers and devices" />
        <SummaryCard icon={Smartphone} label="Trusted Devices" value={trustedDeviceCount} detail="Remembered for faster login" />
        <SummaryCard icon={AlertTriangle} label="Recent Logins" value={security?.loginHistory.length ?? 0} detail={`${failedLoginCount} failed`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-background/60">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Laptop className="h-5 w-5 text-primary" aria-hidden="true" />
                  Active Sessions
                </CardTitle>
                <CardDescription>Devices with a valid login session for this account.</CardDescription>
              </div>
              <Badge variant={activeSessionCount <= 1 ? "success" : "warning"}>{activeSessionCount} active</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? <LoadingRows label="Loading sessions" /> : null}
            {!loading && security?.sessions.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No active sessions found.</p> : null}
            {!loading && security?.sessions.length ? (
              <div className="divide-y">
                {security.sessions.map((sessionItem) => (
                  <SessionRow
                    key={sessionItem.id}
                    busy={busyAction === sessionItem.id}
                    sessionItem={sessionItem}
                    onRevoke={() => (sessionItem.current ? setCurrentSessionToRevoke(sessionItem) : void handleRevokeSession(sessionItem))}
                  />
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-background/60">
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" aria-hidden="true" />
              Sign-in Protections
            </CardTitle>
            <CardDescription>Password and second-factor controls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <SettingToggle
                checked={settings?.emailOtpEnabled ?? false}
                disabled={!settings || busyAction === "settings"}
                icon={Mail}
                label="Email Verification"
                supportingText="Use email OTP as a sign-in check."
                onClick={() => void handleSecuritySettingChange("emailOtpEnabled")}
              />
              <SettingToggle
                checked={settings?.smsOtpEnabled ?? false}
                disabled={!settings || busyAction === "settings" || !settings.phoneVerified}
                icon={Phone}
                label="Phone Verification"
                supportingText={settings?.phoneVerified ? "Use SMS OTP as a sign-in check." : "Verify a phone number before SMS OTP."}
                onClick={() => void handleSecuritySettingChange("smsOtpEnabled")}
              />
            </div>
            <form className="space-y-4" noValidate onSubmit={handlePasswordSubmit}>
              <div className="flex items-center gap-2 border-t pt-5">
                <KeyRound className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <h2 className="text-base font-semibold">Password</h2>
              </div>
              <div className="space-y-2">
                <Label htmlFor="security-current-password">Current password</Label>
                <PasswordInput
                  id="security-current-password"
                  value={passwords.currentPassword}
                  autoComplete="current-password"
                  aria-describedby={passwordErrors.currentPassword ? "security-current-password-error" : undefined}
                  aria-invalid={passwordErrors.currentPassword ? "true" : undefined}
                  disabled={busyAction === "password"}
                  onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))}
                />
                <FieldError id="security-current-password-error">{passwordErrors.currentPassword}</FieldError>
              </div>
              <div className="space-y-2">
                <Label htmlFor="security-new-password">New password</Label>
                <PasswordInput
                  id="security-new-password"
                  value={passwords.newPassword}
                  autoComplete="new-password"
                  minLength={8}
                  showRequirements
                  aria-describedby={passwordErrors.newPassword ? "security-new-password-error" : undefined}
                  aria-invalid={passwordErrors.newPassword ? "true" : undefined}
                  disabled={busyAction === "password"}
                  onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))}
                />
                <FieldError id="security-new-password-error">{passwordErrors.newPassword}</FieldError>
              </div>
              <div className="space-y-2">
                <Label htmlFor="security-confirm-password">Confirm password</Label>
                <PasswordInput
                  id="security-confirm-password"
                  value={passwords.confirmPassword}
                  autoComplete="new-password"
                  minLength={8}
                  aria-describedby={passwordErrors.confirmPassword ? "security-confirm-password-error" : undefined}
                  aria-invalid={passwordErrors.confirmPassword ? "true" : undefined}
                  disabled={busyAction === "password"}
                  onChange={(event) => setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))}
                />
                <FieldError id="security-confirm-password-error">{passwordErrors.confirmPassword}</FieldError>
              </div>
              <Button disabled={busyAction === "password"} type="submit">
                {busyAction === "password" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Change password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-background/60">
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-primary" aria-hidden="true" />
              Recent Logins
            </CardTitle>
            <CardDescription>Recent successful and failed sign-in attempts.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? <LoadingRows label="Loading login history" /> : null}
            {!loading && security?.loginHistory.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No login history yet.</p> : null}
            {!loading && security?.loginHistory.length ? (
              <Table className="min-w-[720px]">
                <thead>
                  <tr className="border-b">
                    <Th>Timestamp</Th>
                    <Th>Status</Th>
                    <Th>Method</Th>
                    <Th>Device</Th>
                    <Th>Browser</Th>
                    <Th>OS</Th>
                    <Th>IP</Th>
                    <Th>Country</Th>
                  </tr>
                </thead>
                <tbody>
                  {security.loginHistory.map((entry) => (
                    <tr className="border-b last:border-0" key={entry.id}>
                      <Td>{formatDate(entry.timestamp)}</Td>
                      <Td>
                        <Badge variant={entry.status === "success" ? "success" : "destructive"}>{entry.status}</Badge>
                      </Td>
                      <Td>{methodLabels[entry.method]}</Td>
                      <Td>{entry.device}</Td>
                      <Td>{entry.browser}</Td>
                      <Td>{entry.operatingSystem}</Td>
                      <Td>{entry.ipAddress}</Td>
                      <Td>{entry.country ?? "Unknown"}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : null}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-background/60">
            <CardTitle className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-primary" aria-hidden="true" />
              Trusted Devices
            </CardTitle>
            <CardDescription>Devices remembered for 30 days after trusted sign-in.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? <LoadingRows label="Loading trusted devices" /> : null}
            {!loading && security?.trustedDevices.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No trusted devices saved.</p> : null}
            {!loading && security?.trustedDevices.length ? (
              <div className="divide-y">
                {security.trustedDevices.map((device) => (
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start" key={device.id}>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <Laptop className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {device.browser} on {device.operatingSystem}
                      </p>
                      <p className="text-sm text-muted-foreground">{device.device}</p>
                      <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                        {device.ipAddress}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Last used {formatDate(device.lastUsedAt)}. Expires {formatDate(device.expiresAt)}.
                      </p>
                    </div>
                    <Button
                      aria-label={`Remove trusted device ${device.browser} on ${device.operatingSystem}`}
                      disabled={busyAction === device.id}
                      size="sm"
                      variant="outline"
                      onClick={() => void handleRemoveTrustedDevice(device.id)}
                    >
                      {busyAction === device.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(currentSessionToRevoke)}
        title="Revoke current session?"
        description="This will immediately sign this browser out."
        onOpenChange={(open) => {
          if (!open) setCurrentSessionToRevoke(null);
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setCurrentSessionToRevoke(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => (currentSessionToRevoke ? void handleRevokeSession(currentSessionToRevoke, true) : undefined)}
          >
            <Trash2 className="h-4 w-4" />
            Revoke and log out
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function SecurityScore({ score, loading }: { score: number; loading: boolean }) {
  return (
    <div className="relative grid h-32 w-32 shrink-0 place-items-center rounded-full bg-muted">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(hsl(var(--primary)) ${loading ? 0 : score * 3.6}deg, hsl(var(--muted)) 0deg)`,
        }}
      />
      <div className="relative grid h-24 w-24 place-items-center rounded-full bg-card shadow-xs">
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : (
          <div className="text-center">
            <p className="text-3xl font-bold leading-none">{score}</p>
            <p className="mt-1 text-xs text-muted-foreground">of 100</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProtectionCard({
  description,
  enabled,
  icon: Icon,
  label,
  loading,
}: {
  description: string;
  enabled: boolean;
  icon: LucideIcon;
  label: string;
  loading: boolean;
}) {
  const StatusIcon = enabled ? CheckCircle2 : CircleAlert;
  return (
    <div className="flex min-h-40 flex-col justify-between gap-5 border-b p-5 even:sm:border-l sm:[&:nth-child(n+3)]:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <span className={cn("grid h-11 w-11 place-items-center rounded-full", enabled ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <Badge variant={loading ? "muted" : enabled ? "success" : "warning"}>
          {loading ? "Checking" : enabled ? "On" : "Review"}
        </Badge>
      </div>
      <div>
        <p className="flex items-center gap-2 font-semibold">
          <StatusIcon className="h-4 w-4" aria-hidden="true" />
          {label}
        </p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function SummaryCard({ detail, icon: Icon, label, value }: { detail: string; icon: LucideIcon; label: string; value: number }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-4 p-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionRow({
  busy,
  onRevoke,
  sessionItem,
}: {
  busy: boolean;
  onRevoke: () => void;
  sessionItem: SecuritySession;
}) {
  return (
    <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-center">
      <div className="flex min-w-0 gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Laptop className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {sessionItem.browser}
            {sessionItem.current ? <Badge>Current Session</Badge> : null}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {sessionItem.device} on {sessionItem.operatingSystem}
          </p>
        </div>
      </div>
      <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-1">
        <span className="flex items-center gap-2">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          {sessionItem.country ?? "Unknown"} / {sessionItem.ipAddress}
        </span>
        <span className="flex items-center gap-2">
          <Clock3 className="h-4 w-4" aria-hidden="true" />
          {formatDate(sessionItem.lastActiveAt)}
        </span>
      </div>
      <Button
        aria-label={`Revoke ${sessionItem.current ? "current" : sessionItem.device} session`}
        disabled={busy}
        size="sm"
        variant={sessionItem.current ? "outline" : "destructive"}
        onClick={onRevoke}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        Revoke
      </Button>
    </div>
  );
}

function SettingToggle({
  checked,
  disabled,
  icon: Icon,
  label,
  supportingText,
  onClick,
}: {
  checked: boolean;
  disabled: boolean;
  icon: LucideIcon;
  label: string;
  supportingText: string;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-background/70 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{supportingText}</p>
      </div>
      <Switch checked={checked} aria-label={`Toggle ${label}`} disabled={disabled} onClick={onClick} />
    </div>
  );
}

function LoadingRows({ label }: { label: string }) {
  return (
    <div className="flex min-h-28 items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

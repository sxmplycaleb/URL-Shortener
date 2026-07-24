import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock3,
  KeyRound,
  Laptop,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Trash2,
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Center</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Review sessions, login activity, trusted devices, and sign-in protections for your account.
          </p>
        </div>
        <Button disabled={loading || busyAction === "others"} variant="outline" onClick={() => void handleRevokeOthers()}>
          {busyAction === "others" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
          Revoke other sessions
        </Button>
      </div>

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
        <SummaryCard icon={Laptop} label="Active sessions" value={activeSessionCount} />
        <SummaryCard icon={Smartphone} label="Trusted devices" value={trustedDeviceCount} />
        <SummaryCard icon={ShieldOff} label="Failed logins" value={failedLoginCount} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Laptop className="h-5 w-5" aria-hidden="true" />
              Active Sessions
            </CardTitle>
            <CardDescription>Devices with a valid login session for this account.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <LoadingRows label="Loading sessions" /> : null}
            {!loading && security?.sessions.length === 0 ? <p className="text-sm text-muted-foreground">No active sessions found.</p> : null}
            {!loading && security?.sessions.length ? (
              <Table>
                <thead>
                  <tr className="border-b">
                    <Th>Browser</Th>
                    <Th>Device</Th>
                    <Th>Operating System</Th>
                    <Th>IP Address</Th>
                    <Th>Country</Th>
                    <Th>Last Active</Th>
                    <Th>Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {security.sessions.map((sessionItem) => (
                    <tr className="border-b last:border-0" key={sessionItem.id}>
                      <Td>
                        <div className="flex min-w-40 items-center gap-2">
                          <span>{sessionItem.browser}</span>
                          {sessionItem.current ? <Badge>Current Session</Badge> : null}
                        </div>
                      </Td>
                      <Td>{sessionItem.device}</Td>
                      <Td>{sessionItem.operatingSystem}</Td>
                      <Td>{sessionItem.ipAddress}</Td>
                      <Td>{sessionItem.country ?? "Unknown"}</Td>
                      <Td>{formatDate(sessionItem.lastActiveAt)}</Td>
                      <Td>
                        <Button
                          aria-label={`Revoke ${sessionItem.current ? "current" : sessionItem.device} session`}
                          disabled={busyAction === sessionItem.id}
                          size="sm"
                          variant={sessionItem.current ? "outline" : "destructive"}
                          onClick={() =>
                            sessionItem.current ? setCurrentSessionToRevoke(sessionItem) : void handleRevokeSession(sessionItem)
                          }
                        >
                          {busyAction === sessionItem.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          Revoke
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
              Security Settings
            </CardTitle>
            <CardDescription>Manage password and sign-in method protection.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="space-y-4" noValidate onSubmit={handlePasswordSubmit}>
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

            <SettingToggle
              checked={settings?.emailOtpEnabled ?? false}
              disabled={!settings || busyAction === "settings"}
              icon={Mail}
              label="Email OTP"
              supportingText="Allow one-time passcodes by email."
              onClick={() => void handleSecuritySettingChange("emailOtpEnabled")}
            />
            <SettingToggle
              checked={settings?.smsOtpEnabled ?? false}
              disabled={!settings || busyAction === "settings" || !settings.phoneVerified}
              icon={Smartphone}
              label="SMS OTP"
              supportingText={settings?.phoneVerified ? "Allow one-time passcodes by SMS." : "Verify a phone number before enabling SMS OTP."}
              onClick={() => void handleSecuritySettingChange("smsOtpEnabled")}
            />
            <div className="flex items-center gap-3 rounded-md border p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-muted">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">Google account</p>
                <p className="text-sm text-muted-foreground">
                  {settings?.googleLinked ? `Linked${settings.googleLinkedAt ? ` ${formatDate(settings.googleLinkedAt)}` : ""}` : "Not linked"}
                </p>
              </div>
              <Badge variant={settings?.googleLinked ? "success" : "muted"}>{settings?.googleLinked ? "Linked" : "Not linked"}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5" aria-hidden="true" />
              Login History
            </CardTitle>
            <CardDescription>Recent successful and failed sign-in attempts.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <LoadingRows label="Loading login history" /> : null}
            {!loading && security?.loginHistory.length === 0 ? <p className="text-sm text-muted-foreground">No login history yet.</p> : null}
            {!loading && security?.loginHistory.length ? (
              <Table>
                <thead>
                  <tr className="border-b">
                    <Th>Timestamp</Th>
                    <Th>Status</Th>
                    <Th>Method</Th>
                    <Th>Device</Th>
                    <Th>IP</Th>
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
                      <Td>{entry.ipAddress}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
              Trusted Devices
            </CardTitle>
            <CardDescription>Devices remembered for 30 days after trusted sign-in.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <LoadingRows label="Loading trusted devices" /> : null}
            {!loading && security?.trustedDevices.length === 0 ? <p className="text-sm text-muted-foreground">No trusted devices saved.</p> : null}
            {!loading && security?.trustedDevices.length ? (
              <div className="space-y-3">
                {security.trustedDevices.map((device) => (
                  <div className="flex flex-col gap-4 rounded-md border p-4 sm:flex-row sm:items-start" key={device.id}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-muted">
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

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Laptop; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
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
  icon: typeof Mail;
  label: string;
  supportingText: string;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-muted">
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

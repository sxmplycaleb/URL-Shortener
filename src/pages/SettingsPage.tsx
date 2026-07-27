import { FormEvent, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  Building2,
  Check,
  Clock3,
  CreditCard,
  Globe2,
  KeyRound,
  Languages,
  LogOut,
  Moon,
  Palette,
  Plug,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Sun,
  Trash2,
  User,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/useTheme";
import { cn, isValidEmail, validatePassword as validateStrongPassword } from "@/lib/utils";
import { deleteAccount, updateAccountSettings, updatePassword, updateProfile } from "@/services/account";
import { getApiErrorMessage, isAuthorizationError } from "@/services/api";
import { logoutUser } from "@/services/auth";
import { clearAuthSession, getAuthSession, saveAuthSession } from "@/services/authStorage";
import { signOutOfFirebase } from "@/services/firebase";

type NoticeTone = "success" | "error";
type ThemeChoice = "light" | "dark";
type SettingsIcon = LucideIcon;

interface ProfileForm {
  name: string;
  email: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ProfileErrors {
  name?: string;
  email?: string;
}

interface PasswordErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

interface Notice {
  tone: NoticeTone;
  message: string;
}

const notificationGroups = [
  {
    id: "email",
    label: "Email",
    description: "Product updates and link activity summaries delivered to your inbox.",
    connected: true,
  },
  {
    id: "browser",
    label: "Browser",
    description: "In-browser alerts for important account events.",
    connected: false,
  },
  {
    id: "security",
    label: "Security alerts",
    description: "Critical sign-in, password, and device notifications.",
    connected: false,
  },
  {
    id: "marketing",
    label: "Marketing",
    description: "Occasional launch notes, education, and offers.",
    connected: false,
  },
  {
    id: "product",
    label: "Product updates",
    description: "Release notes and workflow improvements.",
    connected: false,
  },
] as const;

const preferences = [
  { label: "Default redirect behaviour", value: "Direct redirect", description: "Short links open their destination immediately." },
  { label: "Timezone", value: "Browser default", description: "Analytics and account timestamps follow this device." },
  { label: "Language", value: "English", description: "Interface copy currently uses the default app language." },
  { label: "Date format", value: "Browser locale", description: "Dates adapt to the active browser locale." },
  { label: "Dashboard preferences", value: "Dedicated page", description: "Widget layout and shortcuts live in dashboard settings." },
] as const;

const apiKeyRows = [
  { label: "Key name", value: "No API keys created" },
  { label: "Created", value: "Not available" },
  { label: "Last used", value: "Never" },
  { label: "Permissions", value: "No permissions assigned" },
] as const;

function FieldError({ children, id }: { children: string | undefined; id: string }) {
  if (!children) return null;

  return (
    <p className="text-sm text-destructive" id={id}>
      {children}
    </p>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const accessToken = session?.accessToken ?? "";
  const { theme, setTheme } = useTheme();
  const user = session?.user;
  const [profile, setProfile] = useState<ProfileForm>({
    name: user?.name ?? "",
    email: user?.email ?? "",
  });
  const [passwords, setPasswords] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.accountSettings?.notificationsEnabled ?? true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const initials = useMemo(
    () =>
      profile.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [profile.name],
  );
  const googleLinkedAt = user?.authProviders?.googleLinkedAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(user.authProviders.googleLinkedAt))
    : undefined;
  const profileDirty = profile.name !== (user?.name ?? "") || profile.email !== (user?.email ?? "");
  const passwordDirty = Boolean(passwords.currentPassword || passwords.newPassword || passwords.confirmPassword);
  const memberSince = user?.createdAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(user.createdAt))
    : "Unknown";

  function validateProfile() {
    const nextErrors: ProfileErrors = {};
    const name = profile.name.trim();
    const email = profile.email.trim();

    if (!name) {
      nextErrors.name = "Name is required.";
    } else if (name.length < 2) {
      nextErrors.name = "Name must be at least 2 characters.";
    }

    if (!email) {
      nextErrors.email = "Email is required.";
    } else if (!isValidEmail(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    return nextErrors;
  }

  function validatePassword() {
    const nextErrors: PasswordErrors = {};

    if (!passwords.currentPassword) {
      nextErrors.currentPassword = "Current password is required.";
    }

    if (!passwords.newPassword) {
      nextErrors.newPassword = "New password is required.";
    } else {
      const passwordError = validateStrongPassword(passwords.newPassword);
      if (passwordError) {
        nextErrors.newPassword = passwordError;
      }
    }

    if (!passwords.confirmPassword) {
      nextErrors.confirmPassword = "Confirm your new password.";
    } else if (passwords.confirmPassword !== passwords.newPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    return nextErrors;
  }

  function showNotice(nextNotice: Notice) {
    setNotice(nextNotice);
    window.setTimeout(() => setNotice(null), 3500);
  }

  function getNoticeMessage(error: unknown) {
    return getApiErrorMessage(error, "Unable to save settings. Please try again.");
  }

  function endSession(message = "Your session expired. Please log in again.") {
    clearAuthSession(message);
    navigate("/login", { replace: true, state: { message } });
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateProfile();
    setProfileErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      showNotice({ tone: "error", message: "Fix the highlighted profile fields." });
      return;
    }

    setSavingProfile(true);
    try {
      const response = await updateProfile(accessToken, {
        name: profile.name.trim(),
        email: profile.email.trim(),
      });
      saveAuthSession({
        accessToken: getAuthSession()?.accessToken ?? accessToken,
        user: response.user,
      });
      setProfile({ name: response.user.name, email: response.user.email });
      showNotice({ tone: "success", message: "Profile settings saved." });
    } catch (error) {
      if (isAuthorizationError(error)) {
        endSession();
        return;
      }

      showNotice({ tone: "error", message: getNoticeMessage(error) });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validatePassword();
    setPasswordErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      showNotice({ tone: "error", message: "Fix the highlighted password fields." });
      return;
    }

    setSavingPassword(true);
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

      showNotice({ tone: "error", message: getNoticeMessage(error) });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLogout() {
    try {
      await signOutOfFirebase();
      await logoutUser();
    } catch {
      // The browser session should still be cleared if the server token is gone.
    } finally {
      clearAuthSession();
      navigate("/login", { replace: true, state: { message: "You have been logged out." } });
    }
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    try {
      await deleteAccount(accessToken);
      clearAuthSession();
      navigate("/register", { replace: true, state: { message: "Account deleted." } });
    } catch (error) {
      if (isAuthorizationError(error)) {
        endSession();
        return;
      }

      showNotice({ tone: "error", message: getNoticeMessage(error) });
    } finally {
      setDeletingAccount(false);
      setDeleteDialogOpen(false);
    }
  }

  async function handleNotificationChange() {
    if (savingSettings) return;

    const nextValue = !notificationsEnabled;
    setNotificationsEnabled(nextValue);
    setSavingSettings(true);

    try {
      const response = await updateAccountSettings(accessToken, {
        notificationsEnabled: nextValue,
      });
      saveAuthSession({
        accessToken: getAuthSession()?.accessToken ?? accessToken,
        user: response.user,
      });
      setNotificationsEnabled(response.user.accountSettings?.notificationsEnabled ?? nextValue);
      showNotice({ tone: "success", message: "Notification preferences saved." });
    } catch (error) {
      setNotificationsEnabled(!nextValue);

      if (isAuthorizationError(error)) {
        endSession();
        return;
      }

      showNotice({ tone: "error", message: getNoticeMessage(error) });
    } finally {
      setSavingSettings(false);
    }
  }

  function handleThemeChange(nextTheme: ThemeChoice) {
    setTheme(nextTheme);
    showNotice({ tone: "success", message: `${nextTheme === "dark" ? "Dark" : "Light"} mode enabled.` });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Phase 8</p>
          <h1 className="mt-1 text-3xl font-bold">Settings</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Manage profile details, account preferences, notification channels, security entry points, and account actions.
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-3 rounded-md border bg-card p-3 shadow-xs sm:max-w-sm">
          {user?.avatar ? (
            <img className="h-12 w-12 shrink-0 rounded-md object-cover" src={user.avatar} alt="" referrerPolicy="no-referrer" />
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-accent text-base font-bold text-accent-foreground">
              {initials || "U"}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold">{profile.name || "Shortly user"}</p>
            <p className="truncate text-sm text-muted-foreground">{profile.email || "No email set"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Member since {memberSince}</p>
          </div>
        </div>
      </div>

      {notice ? (
        <Alert
          className={cn(
            notice.tone === "success" ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10",
          )}
          role="status"
        >
          {notice.message}
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard icon={User} label="Profile" value={profileDirty ? "Unsaved changes" : "Up to date"} tone={profileDirty ? "warning" : "success"} />
        <StatusCard
          icon={ShieldCheck}
          label="Security"
          value={user?.accountSettings?.emailOtpEnabled || user?.accountSettings?.smsOtpEnabled ? "OTP enabled" : "Password protected"}
          tone="default"
        />
        <StatusCard icon={Bell} label="Notifications" value={notificationsEnabled ? "Email enabled" : "Paused"} tone={notificationsEnabled ? "success" : "muted"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)]">
        <div className="space-y-6">
          <SettingsSection
            description="Update the core identity information used across your account."
            icon={User}
            id="profile-settings"
            title="Profile"
          >
            <form className="space-y-5" noValidate onSubmit={handleProfileSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-name">Name</Label>
                  <Input
                    id="settings-name"
                    value={profile.name}
                    autoComplete="name"
                    aria-describedby={profileErrors.name ? "settings-name-error" : "settings-name-help"}
                    aria-invalid={profileErrors.name ? "true" : undefined}
                    disabled={savingProfile}
                    onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground" id="settings-name-help">
                    Displayed on account surfaces and shared workspace context.
                  </p>
                  <FieldError id="settings-name-error">{profileErrors.name}</FieldError>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-email">Email</Label>
                  <Input
                    id="settings-email"
                    value={profile.email}
                    autoComplete="email"
                    inputMode="email"
                    type="email"
                    aria-describedby={profileErrors.email ? "settings-email-error" : "settings-email-help"}
                    aria-invalid={profileErrors.email ? "true" : undefined}
                    disabled={savingProfile}
                    onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground" id="settings-email-help">
                    Used for login, notifications, and account recovery.
                  </p>
                  <FieldError id="settings-email-error">{profileErrors.email}</FieldError>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <ReadOnlyProfileItem icon={KeyRound} label="Username" value={user?.email ? (user.email.split("@")[0] ?? "Not set") : "Not set"} />
                <ReadOnlyProfileItem icon={Smartphone} label="Phone" value={user?.phone ?? "No phone number saved"} />
                <ReadOnlyProfileItem icon={Building2} label="Organisation" value="Personal workspace" />
                <ReadOnlyProfileItem icon={Clock3} label="Timezone" value="Browser default" />
                <ReadOnlyProfileItem icon={Languages} label="Language" value="English" />
                <ReadOnlyProfileItem icon={Globe2} label="Account role" value={user?.role ?? "User"} />
              </div>

              <SaveRow dirty={profileDirty} loading={savingProfile} submitLabel="Save profile" />
            </form>
          </SettingsSection>

          <SettingsSection
            description="Change passwords and review multi-factor, session, device, login history, and recovery status."
            icon={ShieldCheck}
            id="security-settings"
            title="Security"
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
              <form className="space-y-4" noValidate onSubmit={handlePasswordSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="settings-current-password">Current password</Label>
                  <PasswordInput
                    id="settings-current-password"
                    value={passwords.currentPassword}
                    autoComplete="current-password"
                    aria-describedby={passwordErrors.currentPassword ? "settings-current-password-error" : undefined}
                    aria-invalid={passwordErrors.currentPassword ? "true" : undefined}
                    disabled={savingPassword}
                    onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))}
                  />
                  <FieldError id="settings-current-password-error">{passwordErrors.currentPassword}</FieldError>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="settings-new-password">New password</Label>
                    <PasswordInput
                      id="settings-new-password"
                      value={passwords.newPassword}
                      autoComplete="new-password"
                      minLength={8}
                      aria-describedby={passwordErrors.newPassword ? "settings-new-password-error" : undefined}
                      aria-invalid={passwordErrors.newPassword ? "true" : undefined}
                      disabled={savingPassword}
                      showRequirements
                      onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))}
                    />
                    <FieldError id="settings-new-password-error">{passwordErrors.newPassword}</FieldError>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-confirm-password">Confirm password</Label>
                    <PasswordInput
                      id="settings-confirm-password"
                      value={passwords.confirmPassword}
                      autoComplete="new-password"
                      minLength={8}
                      aria-describedby={passwordErrors.confirmPassword ? "settings-confirm-password-error" : undefined}
                      aria-invalid={passwordErrors.confirmPassword ? "true" : undefined}
                      disabled={savingPassword}
                      onChange={(event) => setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))}
                    />
                    <FieldError id="settings-confirm-password-error">{passwordErrors.confirmPassword}</FieldError>
                  </div>
                </div>
                <SaveRow dirty={passwordDirty} loading={savingPassword} submitLabel="Update password" />
              </form>

              <div className="space-y-3">
                <SecurityStatus label="MFA / OTP status" value={user?.accountSettings?.emailOtpEnabled ? "Email OTP enabled" : "Email OTP available"} />
                <SecurityStatus label="Active sessions" value="Review in Security Center" />
                <SecurityStatus label="Trusted devices" value={user?.phoneVerified ? "Phone verified" : "No verified phone"} />
                <SecurityStatus label="Login history" value="Recent activity available" />
                <SecurityStatus label="Recovery methods" value={user?.emailVerified ? "Verified email" : "Email verification pending"} />
                <Button className="w-full justify-center" type="button" variant="outline" onClick={() => navigate("/settings/security")}>
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Open Security Center
                </Button>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            description="Choose display preferences and defaults. Unsupported controls are shown as placeholders only."
            icon={Palette}
            id="preferences-settings"
            title="Preferences"
          >
            <div className="space-y-5">
              <div className="space-y-3">
                <Label>Theme</Label>
                <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Theme preference">
                  <ThemeOption
                    active={theme === "light"}
                    description="Bright dashboard surfaces for daytime work."
                    icon={Sun}
                    label="Light mode"
                    onClick={() => handleThemeChange("light")}
                  />
                  <ThemeOption
                    active={theme === "dark"}
                    description="Dimmed contrast for low-light sessions."
                    icon={Moon}
                    label="Dark mode"
                    onClick={() => handleThemeChange("dark")}
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {preferences.map((preference) => (
                  <InfoRow key={preference.label} label={preference.label} value={preference.value} description={preference.description} />
                ))}
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            description="Control the channels Shortly can use to contact you. Only connected settings are saved."
            icon={Bell}
            id="notification-settings"
            title="Notifications"
          >
            <div className="grid gap-3 md:grid-cols-2">
              {notificationGroups.map((group) => (
                <NotificationToggle
                  key={group.id}
                  checked={group.connected ? notificationsEnabled : false}
                  connected={group.connected}
                  description={group.description}
                  disabled={savingSettings || !group.connected}
                  label={group.label}
                  loading={group.connected && savingSettings}
                  onClick={() => (group.connected ? void handleNotificationChange() : undefined)}
                />
              ))}
            </div>
          </SettingsSection>

          <SettingsSection
            description="Review developer access surfaces without adding new API management logic."
            icon={KeyRound}
            id="api-key-settings"
            title="API Keys"
          >
            <div className="rounded-md border bg-background">
              <div className="grid gap-0 sm:grid-cols-4">
                {apiKeyRows.map((row) => (
                  <div className="border-b p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0" key={row.label}>
                    <p className="text-xs font-medium uppercase text-muted-foreground">{row.label}</p>
                    <p className="mt-2 text-sm font-medium">{row.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">API key management is not exposed in this settings interface yet.</p>
                <div className="flex flex-wrap gap-2">
                  <Button disabled variant="outline">
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Regenerate
                  </Button>
                  <Button disabled variant="outline">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Revoke
                  </Button>
                </div>
              </div>
            </div>
          </SettingsSection>
        </div>

        <aside className="space-y-6">
          <SettingsSection
            description="Provider status and future workspace connections."
            icon={Plug}
            id="integration-settings"
            title="Integrations"
          >
            <div className="space-y-3">
              <IntegrationRow
                label="Email sign-in"
                status={user?.authProviders?.email ? "Connected" : "Not connected"}
                variant={user?.authProviders?.email ? "success" : "muted"}
              />
              <IntegrationRow
                label="Google"
                status={user?.authProviders?.google ? "Connected" : "Not connected"}
                variant={user?.authProviders?.google ? "success" : "muted"}
                {...(googleLinkedAt ? { supportingText: `Linked ${googleLinkedAt}` } : {})}
              />
              <IntegrationRow label="Workspace integrations" status="Placeholder" variant="muted" />
            </div>
          </SettingsSection>

          <SettingsSection
            description="Plan controls are intentionally placeholder-only for this phase."
            icon={CreditCard}
            id="billing-settings"
            title="Billing"
          >
            <div className="rounded-md border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">Free workspace</p>
                  <p className="mt-1 text-sm text-muted-foreground">Billing is not supported in the current product surface.</p>
                </div>
                <Badge variant="muted">Placeholder</Badge>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            className="border-destructive/40"
            description="Separated account actions with clear consequences."
            icon={AlertTriangle}
            id="danger-zone"
            title="Danger Zone"
          >
            <div className="space-y-3">
              <DangerAction
                description="End this browser session and return to login."
                icon={LogOut}
                label="Logout"
                onClick={handleLogout}
                variant="outline"
              />
              <DangerAction description="Temporarily deactivate account access." disabled icon={ShieldOff} label="Deactivate account" variant="outline" />
              <DangerAction description="Request removal of exported or retained data." disabled icon={Trash2} label="Remove data" variant="outline" />
              <DangerAction
                description="Permanently removes your URLs, analytics, and account."
                icon={Trash2}
                label="Delete account"
                loading={deletingAccount}
                onClick={() => setDeleteDialogOpen(true)}
                variant="destructive"
              />
            </div>
          </SettingsSection>
        </aside>
      </div>

      <Dialog
        open={deleteDialogOpen}
        title="Delete account?"
        description="This permanently removes your account, URLs, and analytics."
        loading={deletingAccount}
        onOpenChange={setDeleteDialogOpen}
      >
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4">
          <p className="font-medium text-destructive">This action cannot be undone.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You will be signed out and redirected after the account is deleted.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button disabled={deletingAccount} variant="outline" onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button loading={deletingAccount} loadingLabel="Deleting account" variant="destructive" onClick={() => void handleDeleteAccount()}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete account
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function SettingsSection({
  children,
  className,
  description,
  icon: Icon,
  id,
  title,
}: {
  children: ReactNode;
  className?: string;
  description: string;
  icon: SettingsIcon;
  id: string;
  title: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <CardTitle id={id}>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent aria-labelledby={id}>{children}</CardContent>
    </Card>
  );
}

function SaveRow({ dirty, loading, submitLabel }: { dirty: boolean; loading: boolean; submitLabel: string }) {
  return (
    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className={cn("text-sm", dirty ? "text-warning" : "text-muted-foreground")} role="status">
        {dirty ? "Unsaved changes" : "No unsaved changes"}
      </p>
      <Button className="justify-center sm:w-fit" disabled={loading} loading={loading} loadingLabel="Saving settings" type="submit">
        {!loading ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
        {submitLabel}
      </Button>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: SettingsIcon;
  label: string;
  tone: "default" | "muted" | "success" | "warning";
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={cn("truncate font-semibold", tone === "success" ? "text-success" : "", tone === "warning" ? "text-warning" : "")}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ReadOnlyProfileItem({
  icon: Icon,
  label,
  value,
}: {
  icon: SettingsIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-20 items-start gap-3 rounded-md border bg-background p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function SecurityStatus({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border bg-background p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{value}</p>
      </div>
      <Badge variant="muted">Review</Badge>
    </div>
  );
}

function InfoRow({ description, label, value }: { description: string; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-4">
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <Badge className="mt-3" variant="muted">
        {value}
      </Badge>
    </div>
  );
}

function NotificationToggle({
  checked,
  connected,
  description,
  disabled,
  label,
  loading,
  onClick,
}: {
  checked: boolean;
  connected: boolean;
  description: string;
  disabled: boolean;
  label: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex min-h-32 flex-col justify-between gap-4 rounded-md border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant={connected ? "success" : "muted"}>{connected ? "Saved" : "Placeholder"}</Badge>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{connected ? "Uses existing notification preference" : "No backend support yet"}</p>
        <Switch
          checked={checked}
          aria-label={`Toggle ${label} notifications`}
          aria-busy={loading || undefined}
          disabled={disabled}
          onClick={onClick}
        />
      </div>
    </div>
  );
}

function IntegrationRow({
  label,
  status,
  supportingText,
  variant,
}: {
  label: string;
  status: string;
  supportingText?: string;
  variant: "success" | "muted";
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border bg-background p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {supportingText ? <p className="mt-1 text-xs text-muted-foreground">{supportingText}</p> : null}
      </div>
      <Badge variant={variant}>{status}</Badge>
    </div>
  );
}

function DangerAction({
  description,
  disabled = false,
  icon: Icon,
  label,
  loading = false,
  onClick,
  variant,
}: {
  description: string;
  disabled?: boolean;
  icon: SettingsIcon;
  label: string;
  loading?: boolean;
  onClick?: () => void;
  variant: "destructive" | "outline";
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Button className="justify-center sm:w-fit" disabled={disabled || loading} loading={loading} variant={variant} onClick={onClick}>
        {!loading ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
        {label}
      </Button>
    </div>
  );
}

function ThemeOption({
  active,
  description,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  description: string;
  icon: typeof Sun;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-h-28 items-start gap-3 rounded-md border p-4 text-left transition-colors hover:bg-muted",
        active ? "border-primary bg-primary/10" : "bg-background",
      )}
      aria-pressed={active}
      onClick={onClick}
    >
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-md", active ? "bg-primary text-primary-foreground" : "bg-muted")}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

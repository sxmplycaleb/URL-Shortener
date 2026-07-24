import { FormEvent, useMemo, useState } from "react";
import { Check, Loader2, LogOut, Mail, Moon, ShieldCheck, Sun, Trash2, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    const confirmed = window.confirm("Delete this account? This permanently removes your URLs and analytics.");
    if (!confirmed) return;

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Manage your account preferences, security details, notifications, and account actions.
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-3 rounded-md border bg-card p-3 sm:max-w-xs">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-accent text-sm font-bold text-accent-foreground">
            {initials || "U"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{profile.name || "Shortly user"}</p>
            <p className="truncate text-xs text-muted-foreground">{profile.email || "No email set"}</p>
          </div>
        </div>
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

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" aria-hidden="true" />
              Profile Settings
            </CardTitle>
            <CardDescription>Update the name and email shown across your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" noValidate onSubmit={handleProfileSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-name">Name</Label>
                  <Input
                    id="settings-name"
                    value={profile.name}
                    autoComplete="name"
                    aria-describedby={profileErrors.name ? "settings-name-error" : undefined}
                    aria-invalid={profileErrors.name ? "true" : undefined}
                    disabled={savingProfile}
                    onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                  />
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
                    aria-describedby={profileErrors.email ? "settings-email-error" : undefined}
                    aria-invalid={profileErrors.email ? "true" : undefined}
                    disabled={savingProfile}
                    onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
                  />
                  <FieldError id="settings-email-error">{profileErrors.email}</FieldError>
                </div>
              </div>
              <Button disabled={savingProfile} type="submit">
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Update profile
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              Authentication
            </CardTitle>
            <CardDescription>Review the sign-in methods linked to your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-md border p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-muted">
                <Mail className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">Email</p>
                <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
              </div>
              {user?.authProviders?.email ? <Check className="h-5 w-5 text-success" aria-hidden="true" /> : null}
            </div>

            {user?.authProviders?.google ? (
              <div className="flex items-center gap-3 rounded-md border p-4">
                {user.avatar ? (
                  <img className="h-10 w-10 shrink-0 rounded-md object-cover" src={user.avatar} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-muted">
                    <GoogleIcon />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Google account linked</p>
                  <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
                  {googleLinkedAt ? <p className="text-xs text-muted-foreground">Linked {googleLinkedAt}</p> : null}
                </div>
                <Check className="h-5 w-5 text-success" aria-hidden="true" />
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-md border p-4 text-muted-foreground">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-muted">
                  <GoogleIcon />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">Google</p>
                  <p className="text-sm">No Google account linked.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              Account Security
            </CardTitle>
            <CardDescription>Change your password or open the full Security Center.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" noValidate onSubmit={handlePasswordSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
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
              <Button disabled={savingPassword} type="submit">
                {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Update password
              </Button>
            </form>
            <Button className="mt-4" type="button" variant="outline" onClick={() => navigate("/settings/security")}>
              <ShieldCheck className="h-4 w-4" />
              Open Security Center
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Application Preferences</CardTitle>
            <CardDescription>Choose how Shortly looks and when it can notify you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <Label>Theme preference</Label>
              <div className="grid gap-3 sm:grid-cols-2">
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

            <div className="flex flex-col gap-4 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Notification preferences</p>
                <p className="text-sm text-muted-foreground">Receive product updates and link activity summaries.</p>
              </div>
              <Switch
                checked={notificationsEnabled}
                aria-label="Toggle notification preferences"
                disabled={savingSettings}
                onClick={() => void handleNotificationChange()}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
            <CardDescription>Sign out of this browser or remove the demo account state.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button className="justify-center sm:w-fit" variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
            <Button className="justify-center sm:w-fit" disabled={deletingAccount} variant="destructive" onClick={() => void handleDeleteAccount()}>
              {deletingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete account
            </Button>
          </CardContent>
        </Card>
      </div>
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

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
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

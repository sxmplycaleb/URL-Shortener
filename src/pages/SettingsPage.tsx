import { useState } from "react";
import { KeyRound, ShieldAlert, User } from "lucide-react";

import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function SettingsPage() {
  const [rotateKeys, setRotateKeys] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage profile, security, theme, API access, and destructive actions.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Settings sections">
          {["Profile", "Password", "Theme", "API key", "Danger zone"].map((item, index) => (
            <a
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${index === 0 ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
              href={`#${item.toLowerCase().replace(/ /g, "-")}`}
              key={item}
            >
              {item}
            </a>
          ))}
        </nav>
        <div className="space-y-4">
          <Card id="profile">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" aria-hidden="true" />
                Profile
              </CardTitle>
              <CardDescription>Update public account information.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayName">Name</Label>
                <Input id="displayName" defaultValue="Chino" autoComplete="name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profileEmail">Email</Label>
                <Input id="profileEmail" defaultValue="chino@example.com" autoComplete="email" inputMode="email" type="email" />
              </div>
              <Button className="sm:w-fit">Save profile</Button>
            </CardContent>
          </Card>

          <Card id="password">
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Use at least 8 characters with a mix of letters, numbers, and symbols.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input id="currentPassword" autoComplete="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input id="newPassword" autoComplete="new-password" minLength={8} type="password" />
              </div>
              <Button className="sm:w-fit">Update password</Button>
            </CardContent>
          </Card>

          <Card id="theme">
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Preference is persisted locally and applied before the app renders.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Dark mode</p>
                <p className="text-sm text-muted-foreground">Toggle the interface theme.</p>
              </div>
              <ThemeToggle />
            </CardContent>
          </Card>

          <Card id="api-key">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" aria-hidden="true" />
                API key
              </CardTitle>
              <CardDescription>Use API keys for server-side link creation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
                <code className="break-all font-mono text-sm">sk_live_************************</code>
                <Badge variant="success">Active</Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Rotate automatically</p>
                  <p className="text-sm text-muted-foreground">Create a new key every 90 days.</p>
                </div>
                <Switch checked={rotateKeys} aria-label="Rotate API key automatically" onClick={() => setRotateKeys((current) => !current)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/40" id="danger-zone">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-5 w-5" aria-hidden="true" />
                Danger zone
              </CardTitle>
              <CardDescription>Destructive actions require confirmation and audit logging.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive">Delete workspace</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

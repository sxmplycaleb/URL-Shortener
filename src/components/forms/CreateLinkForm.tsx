import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { Calendar, Link2, Loader2 } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidCustomAlias, isValidHttpUrl } from "@/lib/utils";

interface CreateLinkFormProps {
  compact?: boolean;
  onCreated?: (shortUrl: string) => void;
}

export function CreateLinkForm({ compact = false, onCreated }: CreateLinkFormProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const errorId = useId();
  const timerRef = useRef<number | undefined>(undefined);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const form = new FormData(event.currentTarget);
    const destinationUrl = String(form.get("destinationUrl") ?? "").trim();
    const alias = String(form.get("alias") ?? "").trim();

    if (!isValidHttpUrl(destinationUrl)) {
      setError("Enter a valid http or https URL.");
      return;
    }

    if (alias && !isValidCustomAlias(alias)) {
      setError("Use 3-64 letters, numbers, underscores, or hyphens, and avoid reserved aliases.");
      return;
    }

    setError("");
    setLoading(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setLoading(false);
      const shortCode = alias || "fresh-link";
      onCreated?.(`https://sho.rt/${shortCode.toLowerCase()}`);
    }, 900);
  }

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return (
    <form className="space-y-4" aria-describedby={error ? errorId : undefined} noValidate onSubmit={handleSubmit}>
      {error ? <Alert id={errorId}>{error}</Alert> : null}
      <div className={compact ? "grid gap-3 lg:grid-cols-[1fr_160px_auto]" : "space-y-4"}>
        <div className="space-y-2">
          <Label htmlFor={compact ? "landing-url" : "destinationUrl"}>Long URL</Label>
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              id={compact ? "landing-url" : "destinationUrl"}
              name="destinationUrl"
              type="url"
              placeholder="https://example.com/very/long/url"
              autoComplete="url"
              aria-describedby={error ? errorId : undefined}
              aria-invalid={error ? "true" : undefined}
              disabled={loading}
              inputMode="url"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={compact ? "landing-alias" : "alias"}>Custom alias</Label>
          <Input
            id={compact ? "landing-alias" : "alias"}
            name="alias"
            placeholder="launch"
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? "true" : undefined}
            disabled={loading}
            maxLength={64}
            pattern="[A-Za-z0-9_-]{3,64}"
          />
        </div>
        {!compact ? (
          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expiration date</Label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" id="expiresAt" name="expiresAt" type="date" disabled={loading} />
            </div>
          </div>
        ) : null}
        <Button className={compact ? "w-full self-end lg:w-auto" : "w-full"} disabled={loading} type="submit">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Shorten
        </Button>
      </div>
    </form>
  );
}

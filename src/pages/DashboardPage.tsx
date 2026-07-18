import { FormEvent, useCallback, useEffect, useId, useMemo, useState } from "react";
import { BarChart3, CircleAlert, ExternalLink, Link2, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { CopyButton } from "@/components/common/CopyButton";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { StatCard } from "@/components/common/StatCard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, Td, Th } from "@/components/ui/table";
import { Tooltip } from "@/components/ui/tooltip";
import { formatNumber, isValidCustomAlias, isValidHttpUrl } from "@/lib/utils";
import { getApiErrorMessage, isAuthorizationError } from "@/services/api";
import { clearAuthSession, getAuthSession } from "@/services/authStorage";
import { createShortenedUrl, deleteShortenedUrl, listShortenedUrls, type ShortenedUrl } from "@/services/urls";

interface FormErrors {
  originalUrl?: string;
  customAlias?: string;
  form?: string;
}

interface Notice {
  tone: "success" | "error";
  message: string;
}

function getShortUrl(shortCode: string) {
  const apiBase = String(import.meta.env["VITE_API_URL"] ?? "");
  const shortUrlBase = String(import.meta.env["VITE_SHORT_URL_BASE"] ?? "");

  if (shortUrlBase) {
    return `${shortUrlBase.replace(/\/$/, "")}/${encodeURIComponent(shortCode)}`;
  }

  if (apiBase) {
    return `${new URL(apiBase).origin}/${encodeURIComponent(shortCode)}`;
  }

  return `${window.location.origin}/${encodeURIComponent(shortCode)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  return getApiErrorMessage(error, "Unable to reach the URL service. Please try again.");
}

export function DashboardPage() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const accessToken = session?.accessToken ?? "";
  const [urls, setUrls] = useState<ShortenedUrl[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [listError, setListError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const errorId = useId();

  const totalClicks = useMemo(() => urls.reduce((total, url) => total + url.clickCount, 0), [urls]);
  const activeCount = useMemo(() => urls.filter((url) => url.isActive).length, [urls]);

  const endSession = useCallback(() => {
    const message = "Your session expired. Please log in again.";
    clearAuthSession(message);
    navigate("/login", { replace: true, state: { message } });
  }, [navigate]);

  const loadUrls = useCallback(
    async ({ quiet = false }: { quiet?: boolean } = {}) => {
      if (!accessToken) {
        endSession();
        return;
      }

      if (quiet) {
        setRefreshing(true);
      } else {
        setInitialLoading(true);
      }

      try {
        const response = await listShortenedUrls(accessToken);
        setUrls(response.urls);
        setListError("");
      } catch (error) {
        if (isAuthorizationError(error)) {
          endSession();
          return;
        }

        setListError(getErrorMessage(error));
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, endSession],
  );

  useEffect(() => {
    void loadUrls();
  }, [loadUrls]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function validateForm(originalUrl: string, customAlias: string) {
    const nextErrors: FormErrors = {};

    if (!originalUrl) {
      nextErrors.originalUrl = "Long URL is required.";
    } else if (!isValidHttpUrl(originalUrl)) {
      nextErrors.originalUrl = "Enter a valid http or https URL.";
    }

    if (customAlias && !isValidCustomAlias(customAlias)) {
      nextErrors.customAlias = "Use 3-64 letters, numbers, underscores, or hyphens, and avoid reserved aliases.";
    }

    return nextErrors;
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating || !accessToken) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const originalUrl = String(form.get("originalUrl") ?? "").trim();
    const customAlias = String(form.get("customAlias") ?? "").trim();
    const validationErrors = validateForm(originalUrl, customAlias);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setCreating(true);
    setErrors({});

    try {
      const response = await createShortenedUrl(accessToken, {
        originalUrl,
        ...(customAlias ? { customAlias } : {}),
      });
      setUrls((current) => [response.url, ...current.filter((url) => url.id !== response.url.id)]);
      formElement.reset();
      setNotice({ tone: "success", message: `Created ${getShortUrl(response.url.shortCode)}` });
    } catch (error) {
      if (isAuthorizationError(error)) {
        endSession();
        return;
      }

      setErrors({ form: getErrorMessage(error) });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(url: ShortenedUrl) {
    if (deletingId || !accessToken) return;

    const confirmed = window.confirm(`Delete ${getShortUrl(url.shortCode)}?`);
    if (!confirmed) return;

    setDeletingId(url.id);

    try {
      await deleteShortenedUrl(accessToken, url.id);
      setUrls((current) => current.filter((item) => item.id !== url.id));
      setNotice({ tone: "success", message: "Short URL deleted." });
    } catch (error) {
      if (isAuthorizationError(error)) {
        endSession();
        return;
      }

      setNotice({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setDeletingId("");
    }
  }

  if (initialLoading) {
    return <LoadingState label="Loading dashboard" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Create and manage your shortened URLs.</p>
        </div>
        <Button disabled={refreshing} variant="outline" onClick={() => void loadUrls({ quiet: true })}>
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard detail="Owned by your account" icon={Link2} label="Total URLs" value={formatNumber(urls.length)} />
        <StatCard detail="Available for redirects" icon={Plus} label="Active URLs" value={formatNumber(activeCount)} />
        <StatCard detail="Across your short links" icon={BarChart3} label="Total clicks" value={formatNumber(totalClicks)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create short URL</CardTitle>
          <CardDescription>Paste a long URL and optionally reserve a readable alias.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" aria-describedby={errors.form ? errorId : undefined} noValidate onSubmit={handleCreate}>
            {errors.form ? <Alert id={errorId}>{errors.form}</Alert> : null}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-start">
              <div className="space-y-2">
                <Label htmlFor="dashboard-original-url">Long URL</Label>
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    id="dashboard-original-url"
                    name="originalUrl"
                    type="url"
                    placeholder="https://example.com/very/long/url"
                    autoComplete="url"
                    aria-describedby={errors.originalUrl ? "dashboard-original-url-error" : undefined}
                    aria-invalid={errors.originalUrl ? "true" : undefined}
                    disabled={creating}
                    inputMode="url"
                    required
                  />
                </div>
                {errors.originalUrl ? (
                  <p className="text-sm text-destructive" id="dashboard-original-url-error">
                    {errors.originalUrl}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dashboard-custom-alias">Custom alias</Label>
                <Input
                  id="dashboard-custom-alias"
                  name="customAlias"
                  placeholder="launch"
                  aria-describedby={errors.customAlias ? "dashboard-custom-alias-error" : undefined}
                  aria-invalid={errors.customAlias ? "true" : undefined}
                  disabled={creating}
                  maxLength={64}
                  pattern="[A-Za-z0-9_-]{3,64}"
                />
                {errors.customAlias ? (
                  <p className="text-sm text-destructive" id="dashboard-custom-alias-error">
                    {errors.customAlias}
                  </p>
                ) : null}
              </div>
              <Button className="w-full lg:mt-7 lg:w-auto" disabled={creating} type="submit">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Generate short URL
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Your URLs</CardTitle>
            <CardDescription>Copy, open, or delete shortened URLs from your account.</CardDescription>
          </div>
          <Badge variant="muted">{formatNumber(urls.length)} total</Badge>
        </CardHeader>
        <CardContent>
          {listError ? <Alert className="mb-4">{listError}</Alert> : null}
          {urls.length ? (
            <>
              <div className="hidden lg:block">
                <Table>
                  <caption className="sr-only">Shortened URLs</caption>
                  <thead>
                    <tr className="border-b">
                      <Th>Original URL</Th>
                      <Th>Short URL</Th>
                      <Th>Clicks</Th>
                      <Th>Created</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {urls.map((url) => {
                      const shortUrl = getShortUrl(url.shortCode);

                      return (
                        <tr className="border-b last:border-0" key={url.id}>
                          <Td>
                            <p className="max-w-sm truncate text-sm font-medium" title={url.originalUrl}>
                              {url.originalUrl}
                            </p>
                          </Td>
                          <Td>
                            <p className="max-w-xs truncate font-mono text-xs text-muted-foreground">{shortUrl}</p>
                          </Td>
                          <Td className="font-mono">{formatNumber(url.clickCount)}</Td>
                          <Td>{formatDate(url.createdAt)}</Td>
                          <Td>
                            <div className="flex justify-end gap-1">
                              <UrlActions deletingId={deletingId} shortUrl={shortUrl} url={url} onDelete={handleDelete} />
                            </div>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
              <div className="grid gap-3 lg:hidden">
                {urls.map((url) => {
                  const shortUrl = getShortUrl(url.shortCode);

                  return (
                    <Card className="p-4" key={url.id}>
                      <div className="space-y-2">
                        <p className="break-all text-sm font-medium">{url.originalUrl}</p>
                        <p className="break-all font-mono text-xs text-muted-foreground">{shortUrl}</p>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                        <div>
                          <p className="font-mono">{formatNumber(url.clickCount)} clicks</p>
                          <p className="text-muted-foreground">{formatDate(url.createdAt)}</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <UrlActions deletingId={deletingId} shortUrl={shortUrl} url={url} onDelete={handleDelete} />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyState description="Create your first short URL to see it appear here immediately." icon={CircleAlert} title="No URLs yet" />
          )}
        </CardContent>
      </Card>

      {notice ? (
        <div
          className={`fixed bottom-4 left-4 right-4 z-50 max-w-md rounded-lg border p-4 text-sm shadow-panel sm:left-auto ${
            notice.tone === "success" ? "border-success/30 bg-card" : "border-destructive/30 bg-card"
          }`}
          role="status"
          aria-live="polite"
        >
          {notice.message}
        </div>
      ) : null}
    </div>
  );
}

function UrlActions({
  deletingId,
  shortUrl,
  url,
  onDelete,
}: {
  deletingId: string;
  shortUrl: string;
  url: ShortenedUrl;
  onDelete: (url: ShortenedUrl) => Promise<void>;
}) {
  const isDeleting = deletingId === url.id;

  return (
    <>
      <CopyButton label="Copy shortened URL" value={shortUrl} />
      <Tooltip label="Open shortened URL">
        <a
          className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-muted"
          href={shortUrl}
          rel="noopener noreferrer"
          target="_blank"
          aria-label="Open shortened URL"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </Tooltip>
      <Tooltip label="Delete URL">
        <Button
          aria-label="Delete URL"
          disabled={isDeleting}
          size="icon"
          variant="ghost"
          onClick={() => void onDelete(url)}
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
        </Button>
      </Tooltip>
    </>
  );
}

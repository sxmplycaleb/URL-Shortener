import {
  FormEvent,
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  Archive,
  ArchiveRestore,
  BarChart3,
  Check,
  CircleAlert,
  Copy,
  Download,
  ExternalLink,
  GripVertical,
  Link2,
  Loader2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  SlidersHorizontal,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { CopyButton } from "@/components/common/CopyButton";
import { DashboardSkeleton } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { StatCard } from "@/components/common/StatCard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, Td, Th } from "@/components/ui/table";
import { Tooltip } from "@/components/ui/tooltip";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn, formatNumber, isValidCustomAlias, isValidHttpUrl } from "@/lib/utils";
import { getApiErrorMessage, isAuthorizationError } from "@/services/api";
import { clearAuthSession, getAuthSession } from "@/services/authStorage";
import { DASHBOARD_WIDGET_LABELS, type DashboardWidgetId } from "@/services/dashboardPreferences";
import {
  createShortenedUrl,
  deleteShortenedUrl,
  listShortenedUrls,
  updateShortenedUrl,
  type ShortenedUrl,
} from "@/services/urls";

interface FormErrors {
  originalUrl?: string;
  customAlias?: string;
  title?: string;
  form?: string;
}

interface Notice {
  tone: "success" | "error";
  message: string;
}

type SortKey = "newest" | "oldest" | "most-clicks" | "least-clicks" | "az" | "za" | "recently-updated";
type FilterKey = "active" | "expired" | "favorites" | "archived" | "qr" | "shared" | "created" | "updated";
type PendingConfirm =
  | { type: "delete"; urls: ShortenedUrl[] }
  | { type: "archive"; urls: ShortenedUrl[] }
  | { type: "restore"; urls: ShortenedUrl[] };

const SEARCH_STORAGE_KEY = "shortly.dashboard.search";
const SORT_STORAGE_KEY = "shortly.dashboard.sort";
const PIN_FAVORITES_KEY = "shortly.dashboard.pinFavorites";

const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "most-clicks", label: "Most Clicks" },
  { value: "least-clicks", label: "Least Clicks" },
  { value: "az", label: "Alphabetical (A-Z)" },
  { value: "za", label: "Alphabetical (Z-A)" },
  { value: "recently-updated", label: "Recently Updated" },
];

const filterOptions: Array<{ value: FilterKey; label: string }> = [
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "favorites", label: "Favorites" },
  { value: "archived", label: "Archived" },
  { value: "qr", label: "Has QR Code" },
  { value: "shared", label: "Most Shared" },
  { value: "created", label: "Date Created" },
  { value: "updated", label: "Date Updated" },
];

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(value?: string) {
  if (!value) return "Never";
  return dateFormatter.format(new Date(value));
}

function getErrorMessage(error: unknown) {
  return getApiErrorMessage(error, "Unable to reach the URL service. Please try again.");
}

function getUrlTitle(url: ShortenedUrl) {
  return url.title || url.customAlias || url.shortCode;
}

function isExpired(url: ShortenedUrl) {
  return Boolean(url.expiresAt && new Date(url.expiresAt) <= new Date());
}

function includesQuery(value: string | undefined, query: string) {
  return (value ?? "").toLowerCase().includes(query);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "ig"));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark className="rounded bg-warning/20 px-0.5 text-foreground" key={`${part}-${index}`}>
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  );
}

function normalizeUrl(url: ShortenedUrl): ShortenedUrl {
  return {
    ...url,
    title: url.title ?? "",
    isFavorite: url.isFavorite ?? false,
    isArchived: url.isArchived ?? false,
    hasQrCode: url.hasQrCode ?? false,
    shareCount: url.shareCount ?? 0,
    tags: url.tags ?? [],
  };
}

function createQrSvg(value: string) {
  const cells = 29;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const squares: string[] = [];
  const addFinder = (x: number, y: number) => {
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        const edge = row === 0 || col === 0 || row === 6 || col === 6;
        const center = row >= 2 && row <= 4 && col >= 2 && col <= 4;
        if (edge || center) squares.push(`<rect x="${x + col}" y="${y + row}" width="1" height="1"/>`);
      }
    }
  };

  addFinder(1, 1);
  addFinder(cells - 8, 1);
  addFinder(1, cells - 8);

  for (let y = 0; y < cells; y += 1) {
    for (let x = 0; x < cells; x += 1) {
      const inFinder = (x < 9 && y < 9) || (x > cells - 10 && y < 9) || (x < 9 && y > cells - 10);
      if (inFinder) continue;
      const bit = (Math.imul(x + 17, y + 31) ^ hash ^ (hash >>> ((x + y) % 13))) & 3;
      if (bit === 0 || (x + y) % 11 === 0) squares.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cells} ${cells}" role="img"><rect width="${cells}" height="${cells}" fill="white"/><g fill="black">${squares.join("")}</g></svg>`;
}

function downloadFile(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getAuthSession();
  const accessToken = session?.accessToken ?? "";
  const [urls, setUrls] = useState<ShortenedUrl[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [workingIds, setWorkingIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [listError, setListError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [draggedWidget, setDraggedWidget] = useState<DashboardWidgetId | null>(null);
  const [search, setSearch] = useState(() => localStorage.getItem(SEARCH_STORAGE_KEY) ?? "");
  const [sort, setSort] = useState<SortKey>(() => (localStorage.getItem(SORT_STORAGE_KEY) as SortKey | null) ?? "newest");
  const [filters, setFilters] = useState<FilterKey[]>([]);
  const [pinFavorites, setPinFavorites] = useState(() => localStorage.getItem(PIN_FAVORITES_KEY) === "true");
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState<ShortenedUrl | null>(null);
  const [openMenuId, setOpenMenuId] = useState("");
  const { preferences, setWidgetOrder } = useDashboardPreferences();
  const errorId = useId();
  const debouncedSearch = useDebouncedValue(search);

  const totalClicks = useMemo(() => urls.reduce((total, url) => total + url.clickCount, 0), [urls]);
  const activeCount = useMemo(() => urls.filter((url) => url.isActive && !url.isArchived && !isExpired(url)).length, [urls]);
  const selectedUrls = useMemo(() => urls.filter((url) => selectedIds.includes(url.id)), [selectedIds, urls]);
  const visibleWidgets = useMemo(
    () => preferences.widgetOrder.filter((widgetId) => !preferences.hiddenWidgets.includes(widgetId)),
    [preferences.hiddenWidgets, preferences.widgetOrder],
  );

  const filteredUrls = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const filtered = urls.filter((url) => {
      const matchesSearch =
        !query ||
        includesQuery(url.originalUrl, query) ||
        includesQuery(url.shortUrl, query) ||
        includesQuery(url.shortCode, query) ||
        includesQuery(url.customAlias, query) ||
        includesQuery(url.title, query) ||
        url.tags.some((tag) => includesQuery(tag, query));

      if (!matchesSearch) return false;
      if (filters.includes("active") && (!url.isActive || isExpired(url) || url.isArchived)) return false;
      if (filters.includes("expired") && !isExpired(url)) return false;
      if (filters.includes("favorites") && !url.isFavorite) return false;
      if (filters.includes("archived") && !url.isArchived) return false;
      if (filters.includes("qr") && !url.hasQrCode) return false;
      if (filters.includes("shared") && url.shareCount === 0) return false;
      if (filters.includes("created") && new Date(url.createdAt) < startOfToday) return false;
      if (filters.includes("updated") && new Date(url.updatedAt) < startOfToday) return false;
      return true;
    });

    return filtered.sort((left, right) => {
      if (pinFavorites && left.isFavorite !== right.isFavorite) return left.isFavorite ? -1 : 1;
      if (sort === "oldest") return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      if (sort === "most-clicks") return right.clickCount - left.clickCount;
      if (sort === "least-clicks") return left.clickCount - right.clickCount;
      if (sort === "az") return getUrlTitle(left).localeCompare(getUrlTitle(right));
      if (sort === "za") return getUrlTitle(right).localeCompare(getUrlTitle(left));
      if (sort === "recently-updated") return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [debouncedSearch, filters, pinFavorites, sort, urls]);

  const endSession = useCallback(() => {
    const message = "Your session expired. Please log in again.";
    clearAuthSession(message);
    navigate("/login", { replace: true, state: { message } });
  }, [navigate]);

  const showNotice = useCallback((nextNotice: Notice) => setNotice(nextNotice), []);

  const loadUrls = useCallback(
    async ({ quiet = false }: { quiet?: boolean } = {}) => {
      if (!accessToken) {
        endSession();
        return;
      }

      if (quiet) setRefreshing(true);
      else setInitialLoading(true);

      try {
        const response = await listShortenedUrls(accessToken);
        setUrls(response.urls.map(normalizeUrl));
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
    localStorage.setItem(SEARCH_STORAGE_KEY, search);
  }, [search]);

  useEffect(() => {
    localStorage.setItem(SORT_STORAGE_KEY, sort);
  }, [sort]);

  useEffect(() => {
    localStorage.setItem(PIN_FAVORITES_KEY, String(pinFavorites));
  }, [pinFavorites]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (initialLoading || !location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    target?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [initialLoading, location.hash]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches("input, textarea, select, [contenteditable=true]");
      if (typing) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelectedIds(filteredUrls.map((url) => url.id));
      }
      if (!selectedUrls.length) return;
      if (event.key === "Delete") setConfirm({ type: "delete", urls: selectedUrls });
      if ((event.ctrlKey || event.metaKey || !event.altKey) && event.key.toLowerCase() === "c") void bulkCopy(selectedUrls);
      if (event.key.toLowerCase() === "f") {
        void bulkUpdate(
          selectedUrls,
          { isFavorite: !selectedUrls.every((url) => url.isFavorite) },
          selectedUrls.every((url) => url.isFavorite) ? "Favorite removed" : "Favorite added",
        );
      }
      if (event.key.toLowerCase() === "a") setConfirm({ type: "archive", urls: selectedUrls });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function validateForm(originalUrl: string, customAlias: string, title: string) {
    const nextErrors: FormErrors = {};

    if (!originalUrl) nextErrors.originalUrl = "Long URL is required.";
    else if (!isValidHttpUrl(originalUrl)) nextErrors.originalUrl = "Enter a valid http or https URL.";
    if (customAlias && !isValidCustomAlias(customAlias)) {
      nextErrors.customAlias = "Use 3-64 letters, numbers, underscores, or hyphens, and avoid reserved aliases.";
    }
    if (title.length > 140) nextErrors.title = "Title cannot exceed 140 characters.";

    return nextErrors;
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating || !accessToken) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const originalUrl = String(form.get("originalUrl") ?? "").trim();
    const customAlias = String(form.get("customAlias") ?? "").trim();
    const title = String(form.get("title") ?? "").trim();
    const validationErrors = validateForm(originalUrl, customAlias, title);

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
        ...(title ? { title } : {}),
      });
      setUrls((current) => [normalizeUrl(response.url), ...current.filter((url) => url.id !== response.url.id)]);
      formElement.reset();
      showNotice({ tone: "success", message: `Link created: ${response.url.shortUrl}` });
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

  async function updateOne(url: ShortenedUrl, patch: Partial<ShortenedUrl>, successMessage: string) {
    if (!accessToken) return;
    const previous = urls;
    setWorkingIds((current) => [...current, url.id]);
    setUrls((current) => current.map((item) => (item.id === url.id ? normalizeUrl({ ...item, ...patch, updatedAt: new Date().toISOString() }) : item)));

    try {
      const response = await updateShortenedUrl(accessToken, url.id, patch);
      setUrls((current) => current.map((item) => (item.id === url.id ? normalizeUrl(response.url) : item)));
      showNotice({ tone: "success", message: successMessage });
    } catch (error) {
      if (isAuthorizationError(error)) {
        endSession();
        return;
      }

      setUrls(previous);
      showNotice({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setWorkingIds((current) => current.filter((id) => id !== url.id));
    }
  }

  async function bulkUpdate(items: ShortenedUrl[], patch: Partial<ShortenedUrl>, successMessage: string) {
    if (!items.length || !accessToken) return;
    const previous = urls;
    const ids = items.map((url) => url.id);
    setWorkingIds((current) => [...current, ...ids]);
    setUrls((current) => current.map((url) => (ids.includes(url.id) ? normalizeUrl({ ...url, ...patch, updatedAt: new Date().toISOString() }) : url)));

    try {
      const responses = await Promise.all(items.map((url) => updateShortenedUrl(accessToken, url.id, patch)));
      setUrls((current) =>
        current.map((url) => normalizeUrl(responses.find((response) => response.url.id === url.id)?.url ?? url)),
      );
      showNotice({ tone: "success", message: successMessage });
    } catch (error) {
      setUrls(previous);
      showNotice({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setWorkingIds((current) => current.filter((id) => !ids.includes(id)));
    }
  }

  async function deleteUrls(items: ShortenedUrl[]) {
    if (!items.length || !accessToken) return;
    const previous = urls;
    const ids = items.map((url) => url.id);
    setWorkingIds((current) => [...current, ...ids]);
    setUrls((current) => current.filter((url) => !ids.includes(url.id)));
    setSelectedIds((current) => current.filter((id) => !ids.includes(id)));

    try {
      await Promise.all(items.map((url) => deleteShortenedUrl(accessToken, url.id)));
      showNotice({ tone: "success", message: ids.length > 1 ? "URLs deleted." : "Short URL deleted." });
    } catch (error) {
      setUrls(previous);
      showNotice({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setWorkingIds((current) => current.filter((id) => !ids.includes(id)));
      setConfirm(null);
    }
  }

  async function bulkCopy(items: ShortenedUrl[]) {
    if (!items.length) return;
    await copyText(items.map((url) => url.shortUrl).join("\n"));
      showNotice({ tone: "success", message: items.length > 1 ? "Links copied" : "Link copied" });
  }

  async function handleShare(url: ShortenedUrl, channel: string) {
    const shareText = `${getUrlTitle(url)} ${url.shortUrl}`;
    const encodedUrl = encodeURIComponent(url.shortUrl);
    const encodedText = encodeURIComponent(shareText);
    const hrefs: Record<string, string> = {
      WhatsApp: `https://wa.me/?text=${encodedText}`,
      Facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      X: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      Telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      Email: `mailto:?subject=${encodeURIComponent(getUrlTitle(url))}&body=${encodedText}`,
    };

    if (channel === "Native" && navigator.share) {
      await navigator.share({ title: getUrlTitle(url), text: shareText, url: url.shortUrl });
    } else if (channel === "Copy Link") {
      await copyText(url.shortUrl);
    } else if (hrefs[channel]) {
      window.open(hrefs[channel], "_blank", "noopener,noreferrer");
    }

    await updateOne(url, { shareCount: url.shareCount + 1 }, channel === "Copy Link" ? "Share copied!" : "Share opened.");
    setOpenMenuId("");
  }

  async function copyText(value: string) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return;
      }
    } catch {
      // Fall back for browsers that expose Clipboard API but deny writes.
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  async function generateQr(url: ShortenedUrl) {
    if (!url.hasQrCode) await updateOne(url, { hasQrCode: true }, "QR generated");
    setQrPreviewUrl(normalizeUrl({ ...url, hasQrCode: true }));
  }

  async function downloadQr(url: ShortenedUrl, format: "svg" | "png") {
    const svg = createQrSvg(url.shortUrl);
    if (format === "svg") {
      downloadFile(`${url.shortCode}-qr.svg`, new Blob([svg], { type: "image/svg+xml" }));
    } else {
      const image = new Image();
      const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Unable to render QR code."));
        image.src = source;
      });
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext("2d");
      context?.drawImage(image, 0, 0, 512, 512);
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((nextBlob) => resolve(nextBlob ?? new Blob()), "image/png"));
      downloadFile(`${url.shortCode}-qr.png`, blob);
    }
    showNotice({ tone: "success", message: "QR downloaded" });
  }

  async function copyQrImage(url: ShortenedUrl) {
    const svg = createQrSvg(url.shortUrl);
    await navigator.clipboard.writeText(svg);
    showNotice({ tone: "success", message: "QR copied" });
  }

  function toggleFilter(filter: FilterKey) {
    setFilters((current) => (current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter]));
  }

  function resetControls() {
    setSearch("");
    setFilters([]);
    setSort("newest");
  }

  function moveWidget(targetWidget: DashboardWidgetId) {
    if (!draggedWidget || draggedWidget === targetWidget) return;
    const nextOrder = preferences.widgetOrder.filter((widgetId) => widgetId !== draggedWidget);
    const targetIndex = nextOrder.indexOf(targetWidget);
    nextOrder.splice(targetIndex, 0, draggedWidget);
    setWidgetOrder(nextOrder);
  }

  if (initialLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Create and manage your shortened URLs.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate("/settings/dashboard")}>
            <SlidersHorizontal className="h-4 w-4" />
            Dashboard Settings
          </Button>
          <Button disabled={refreshing} variant="outline" onClick={() => void loadUrls({ quiet: true })}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="space-y-4" aria-label="Customizable dashboard widgets">
        {visibleWidgets.map((widgetId) => (
          <DashboardWidgetFrame
            key={widgetId}
            dragging={draggedWidget === widgetId}
            label={DASHBOARD_WIDGET_LABELS[widgetId]}
            onDragEnd={() => setDraggedWidget(null)}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={() => setDraggedWidget(widgetId)}
            onDrop={() => moveWidget(widgetId)}
          >
            {widgetId === "stats" ? (
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard detail="Owned by your account" icon={Link2} label="Total URLs" value={urls.length} />
                <StatCard detail="Available for redirects" icon={Plus} label="Active URLs" value={activeCount} />
                <StatCard detail="Across your short links" icon={BarChart3} label="Total clicks" value={totalClicks} />
              </div>
            ) : null}

            {widgetId === "create-link" ? (
              <Card id="create-link" className="scroll-mt-24">
                <CardHeader>
                  <CardTitle>Create short URL</CardTitle>
                  <CardDescription>Paste a long URL and optionally reserve a readable alias.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" aria-describedby={errors.form ? errorId : undefined} noValidate onSubmit={handleCreate}>
                    {errors.form ? <Alert id={errorId}>{errors.form}</Alert> : null}
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto] xl:items-start">
                      <Field label="Long URL" error={errors.originalUrl} id="dashboard-original-url">
                        <div className="relative">
                          <Link2 className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9" id="dashboard-original-url" name="originalUrl" type="url" placeholder="https://example.com/very/long/url" autoComplete="url" disabled={creating} inputMode="url" required />
                        </div>
                      </Field>
                      <Field label="Custom alias" error={errors.customAlias} id="dashboard-custom-alias">
                        <Input id="dashboard-custom-alias" name="customAlias" placeholder="launch" disabled={creating} maxLength={64} pattern="[A-Za-z0-9_-]{3,64}" />
                      </Field>
                      <Field label="Title" error={errors.title} id="dashboard-title">
                        <Input id="dashboard-title" name="title" placeholder="Campaign launch" disabled={creating} maxLength={140} />
                      </Field>
                      <Button className="w-full xl:mt-7 xl:w-auto" disabled={creating} type="submit">
                        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Generate short URL
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : null}

            {widgetId === "url-list" ? (
              <Card id="recent-links" className="scroll-mt-24">
                <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Your URLs</CardTitle>
                    <CardDescription>Search, sort, filter, share, archive, and manage links from one place.</CardDescription>
                  </div>
                  <Badge variant="muted">{formatNumber(filteredUrls.length)} shown</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  {listError ? <Alert>{listError}</Alert> : null}
                  <UrlControls
                    allCount={urls.length}
                    filters={filters}
                    pinFavorites={pinFavorites}
                    search={search}
                    selectedCount={selectedIds.length}
                    shownCount={filteredUrls.length}
                    sort={sort}
                    onClearSelection={() => setSelectedIds([])}
                    onFilter={toggleFilter}
                    onPinFavorites={setPinFavorites}
                    onReset={resetControls}
                    onSearch={setSearch}
                    onSelectAll={() => setSelectedIds(filteredUrls.map((url) => url.id))}
                    onSort={setSort}
                  />
                  <BulkToolbar
                    disabled={!selectedUrls.length}
                    selectedCount={selectedUrls.length}
                    onArchive={() => setConfirm({ type: "archive", urls: selectedUrls })}
                    onCopy={() => void bulkCopy(selectedUrls)}
                    onDelete={() => setConfirm({ type: "delete", urls: selectedUrls })}
                    onRestore={() => setConfirm({ type: "restore", urls: selectedUrls })}
                  />
                  <UrlList
                    filters={filters}
                    query={debouncedSearch.trim()}
                    selectedIds={selectedIds}
                    urls={filteredUrls}
                    workingIds={workingIds}
                    onArchive={(url) => setConfirm({ type: "archive", urls: [url] })}
                    onCopy={bulkCopy}
                    onDelete={(url) => setConfirm({ type: "delete", urls: [url] })}
                    onGenerateQr={generateQr}
                    onRestore={(url) => setConfirm({ type: "restore", urls: [url] })}
                    onSelect={(url, selected) => setSelectedIds((current) => (selected ? [...new Set([...current, url.id])] : current.filter((id) => id !== url.id)))}
                    onShare={handleShare}
                    onToggleFavorite={(url) => void updateOne(url, { isFavorite: !url.isFavorite }, url.isFavorite ? "Favorite removed" : "Favorite added")}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                  />
                </CardContent>
              </Card>
            ) : null}
          </DashboardWidgetFrame>
        ))}
      </div>

      <ConfirmationDialog
        confirm={confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.type === "delete") void deleteUrls(confirm.urls);
          if (confirm.type === "archive") void bulkUpdate(confirm.urls, { isArchived: true }, confirm.urls.length > 1 ? "URLs archived" : "URL archived");
          if (confirm.type === "restore") void bulkUpdate(confirm.urls, { isArchived: false }, confirm.urls.length > 1 ? "URLs restored" : "URL restored");
          setConfirm(null);
        }}
      />

      <QrDialog
        url={qrPreviewUrl}
        onClose={() => setQrPreviewUrl(null)}
        onCopy={copyQrImage}
        onDownload={downloadQr}
      />

      {notice ? (
        <div
          className={cn(
            "fixed bottom-4 left-4 right-4 z-50 max-w-md rounded-lg border bg-card p-4 text-sm shadow-panel sm:left-auto",
            notice.tone === "success" ? "border-success/30" : "border-destructive/30",
          )}
          role="status"
          aria-live="polite"
        >
          {notice.message}
        </div>
      ) : null}
    </div>
  );
}

function Field({ children, error, id, label }: { children: ReactNode; error: string | undefined; id: string; label: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function UrlControls({
  allCount,
  filters,
  pinFavorites,
  search,
  selectedCount,
  shownCount,
  sort,
  onClearSelection,
  onFilter,
  onPinFavorites,
  onReset,
  onSearch,
  onSelectAll,
  onSort,
}: {
  allCount: number;
  filters: FilterKey[];
  pinFavorites: boolean;
  search: string;
  selectedCount: number;
  shownCount: number;
  sort: SortKey;
  onClearSelection: () => void;
  onFilter: (filter: FilterKey) => void;
  onPinFavorites: (enabled: boolean) => void;
  onReset: () => void;
  onSearch: (value: string) => void;
  onSelectAll: () => void;
  onSort: (value: SortKey) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input className="pr-11 pl-9" value={search} placeholder="Search original, short URL, alias, title, or tags" aria-label="Search URLs" onChange={(event) => onSearch(event.target.value)} />
          {search ? (
            <Button className="absolute right-1 top-1 h-9 w-9" size="icon" variant="ghost" aria-label="Clear search" onClick={() => onSearch("")}>
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <select className="min-h-11 rounded-md border border-input bg-background px-3 text-sm shadow-sm" aria-label="Sort URLs" value={sort} onChange={(event) => onSort(event.target.value as SortKey)}>
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button variant="outline" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {filterOptions.map((filter) => (
          <button
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              filters.includes(filter.value) ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:bg-muted",
            )}
            key={filter.value}
            type="button"
            aria-pressed={filters.includes(filter.value)}
            onClick={() => onFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
        <label className="inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-sm">
          <input checked={pinFavorites} type="checkbox" onChange={(event) => onPinFavorites(event.target.checked)} />
          Pin favorites
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>{shownCount} of {allCount} URLs</span>
        <span aria-live="polite">{selectedCount} selected</span>
        <Button disabled={!shownCount} size="sm" variant="outline" onClick={onSelectAll}>
          <Check className="h-4 w-4" />
          Select All
        </Button>
        <Button disabled={!selectedCount} size="sm" variant="ghost" onClick={onClearSelection}>
          Clear Selection
        </Button>
      </div>
    </div>
  );
}

function BulkToolbar({ disabled, selectedCount, onArchive, onCopy, onDelete, onRestore }: { disabled: boolean; selectedCount: number; onArchive: () => void; onCopy: () => void; onDelete: () => void; onRestore: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
      <p className="text-sm font-medium">{selectedCount} selected</p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={disabled} size="sm" variant="outline" onClick={onCopy}><Copy className="h-4 w-4" />Bulk Copy</Button>
        <Button disabled={disabled} size="sm" variant="outline" onClick={onArchive}><Archive className="h-4 w-4" />Bulk Archive</Button>
        <Button disabled={disabled} size="sm" variant="outline" onClick={onRestore}><ArchiveRestore className="h-4 w-4" />Bulk Restore</Button>
        <Button disabled={disabled} size="sm" variant="destructive" onClick={onDelete}><Trash2 className="h-4 w-4" />Bulk Delete</Button>
      </div>
    </div>
  );
}

function UrlList(props: {
  filters: FilterKey[];
  query: string;
  selectedIds: string[];
  urls: ShortenedUrl[];
  workingIds: string[];
  openMenuId: string;
  setOpenMenuId: (id: string) => void;
  onArchive: (url: ShortenedUrl) => void;
  onCopy: (urls: ShortenedUrl[]) => void;
  onDelete: (url: ShortenedUrl) => void;
  onGenerateQr: (url: ShortenedUrl) => void;
  onRestore: (url: ShortenedUrl) => void;
  onSelect: (url: ShortenedUrl, selected: boolean) => void;
  onShare: (url: ShortenedUrl, channel: string) => Promise<void>;
  onToggleFavorite: (url: ShortenedUrl) => void;
}) {
  if (!props.urls.length) {
    const favoriteOnly = props.filters.includes("favorites");
    const archiveOnly = props.filters.includes("archived");
    return (
      <EmptyState
        description={props.query ? "Adjust your search or clear filters to see more URLs." : favoriteOnly ? "Star a URL to collect it here." : archiveOnly ? "Archived URLs remain recoverable and will appear here." : "Create your first short URL to see it appear here immediately."}
        icon={CircleAlert}
        title={props.query ? "No search results" : favoriteOnly ? "No favorites yet" : archiveOnly ? "No archived URLs" : "No URLs yet"}
      />
    );
  }

  return (
    <>
      <div className="hidden xl:block">
        <Table>
          <caption className="sr-only">Shortened URLs</caption>
          <thead>
            <tr className="border-b">
              <Th className="w-12">Select</Th>
              <Th>URL</Th>
              <Th>Short URL</Th>
              <Th>Activity</Th>
              <Th>Dates</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {props.urls.map((url) => (
              <UrlRow key={url.id} url={url} {...props} />
            ))}
          </tbody>
        </Table>
      </div>
      <div className="grid gap-3 xl:hidden">
        {props.urls.map((url) => (
          <UrlCard key={url.id} url={url} {...props} />
        ))}
      </div>
    </>
  );
}

function UrlRow(props: Parameters<typeof UrlCard>[0]) {
  const { query, selectedIds, url, workingIds, onSelect } = props;
  return (
    <tr className={cn("border-b transition-colors last:border-0 hover:bg-muted/40", url.isArchived && "opacity-70")}>
      <Td>
        <input aria-label={`Select ${url.shortUrl}`} checked={selectedIds.includes(url.id)} type="checkbox" onChange={(event) => onSelect(url, event.target.checked)} />
      </Td>
      <Td>
        <UrlIdentity query={query} url={url} />
      </Td>
      <Td>
        <p className="max-w-xs truncate font-mono text-xs text-muted-foreground"><Highlight query={query} text={url.shortUrl} /></p>
      </Td>
      <Td>
        <Activity url={url} />
      </Td>
      <Td>
        <Dates url={url} />
      </Td>
      <Td>
        <UrlActions {...props} busy={workingIds.includes(url.id)} />
      </Td>
    </tr>
  );
}

function UrlCard(props: {
  query: string;
  selectedIds: string[];
  url: ShortenedUrl;
  workingIds: string[];
  openMenuId: string;
  setOpenMenuId: (id: string) => void;
  onArchive: (url: ShortenedUrl) => void;
  onCopy: (urls: ShortenedUrl[]) => void;
  onDelete: (url: ShortenedUrl) => void;
  onGenerateQr: (url: ShortenedUrl) => void;
  onRestore: (url: ShortenedUrl) => void;
  onSelect: (url: ShortenedUrl, selected: boolean) => void;
  onShare: (url: ShortenedUrl, channel: string) => Promise<void>;
  onToggleFavorite: (url: ShortenedUrl) => void;
}) {
  const { query, selectedIds, url, workingIds, onSelect } = props;
  return (
    <Card className={cn("p-4 transition-transform hover:-translate-y-0.5", url.isArchived && "opacity-70")}>
      <div className="flex items-start gap-3">
        <input className="mt-1" aria-label={`Select ${url.shortUrl}`} checked={selectedIds.includes(url.id)} type="checkbox" onChange={(event) => onSelect(url, event.target.checked)} />
        <div className="min-w-0 flex-1 space-y-3">
          <UrlIdentity query={query} url={url} />
          <p className="break-all font-mono text-xs text-muted-foreground"><Highlight query={query} text={url.shortUrl} /></p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Activity url={url} />
            <Dates url={url} />
          </div>
          <UrlActions {...props} busy={workingIds.includes(url.id)} />
        </div>
      </div>
    </Card>
  );
}

function UrlIdentity({ query, url }: { query: string; url: ShortenedUrl }) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium"><Highlight query={query} text={getUrlTitle(url)} /></p>
        {url.isFavorite ? <Badge variant="warning">Favorite</Badge> : null}
        {url.isArchived ? <Badge variant="muted">Archived</Badge> : null}
        {isExpired(url) ? <Badge variant="destructive">Expired</Badge> : url.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="warning">Inactive</Badge>}
        {url.hasQrCode ? <Badge variant="default">QR</Badge> : null}
      </div>
      <p className="max-w-lg truncate text-sm text-muted-foreground" title={url.originalUrl}>
        <Highlight query={query} text={url.originalUrl} />
      </p>
    </div>
  );
}

function Activity({ url }: { url: ShortenedUrl }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <Badge variant="muted">{formatNumber(url.clickCount)} clicks</Badge>
      <Badge variant="muted">{formatNumber(url.shareCount)} shares</Badge>
      <span className="text-muted-foreground">Last clicked {formatDate(url.lastClickedAt)}</span>
    </div>
  );
}

function Dates({ url }: { url: ShortenedUrl }) {
  return (
    <div className="text-xs text-muted-foreground">
      <p>Created {formatDate(url.createdAt)}</p>
      <p>Updated {formatDate(url.updatedAt)}</p>
    </div>
  );
}

const UrlActions = memo(function UrlActions({
  busy,
  openMenuId,
  setOpenMenuId,
  url,
  onArchive,
  onDelete,
  onGenerateQr,
  onRestore,
  onShare,
  onToggleFavorite,
}: Parameters<typeof UrlCard>[0] & { busy: boolean }) {
  const menuOpen = openMenuId === url.id;
  return (
    <div className="flex flex-wrap justify-end gap-1">
      <Tooltip label={url.isFavorite ? "Remove favorite" : "Favorite URL"}>
        <Button aria-label={url.isFavorite ? "Remove favorite" : "Favorite URL"} disabled={busy} size="icon" variant="ghost" onClick={() => onToggleFavorite(url)}>
          <Star className={cn("h-4 w-4", url.isFavorite && "fill-warning text-warning")} />
        </Button>
      </Tooltip>
      <CopyButton label="Copy shortened URL" value={url.shortUrl} />
      <Tooltip label="Open shortened URL">
        <a className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={url.shortUrl} rel="noopener noreferrer" target="_blank" aria-label="Open shortened URL">
          <ExternalLink className="h-4 w-4" />
        </a>
      </Tooltip>
      <Tooltip label="Preview QR">
        <Button aria-label={url.hasQrCode ? "Preview QR" : "Generate QR Code"} disabled={busy} size="icon" variant="ghost" onClick={() => void onGenerateQr(url)}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
        </Button>
      </Tooltip>
      <div className="relative">
        <Tooltip label="Share URL">
          <Button aria-expanded={menuOpen} aria-haspopup="menu" aria-label="Share URL" size="icon" variant="ghost" onClick={() => setOpenMenuId(menuOpen ? "" : url.id)}>
            <Share2 className="h-4 w-4" />
          </Button>
        </Tooltip>
        {menuOpen ? <ShareMenu url={url} onShare={onShare} /> : null}
      </div>
      {url.isArchived ? (
        <Tooltip label="Restore URL">
          <Button aria-label="Restore URL" disabled={busy} size="icon" variant="ghost" onClick={() => onRestore(url)}><ArchiveRestore className="h-4 w-4" /></Button>
        </Tooltip>
      ) : (
        <Tooltip label="Archive URL">
          <Button aria-label="Archive URL" disabled={busy} size="icon" variant="ghost" onClick={() => onArchive(url)}><Archive className="h-4 w-4" /></Button>
        </Tooltip>
      )}
      <Tooltip label="Delete URL">
        <Button aria-label="Delete URL" disabled={busy} size="icon" variant="ghost" onClick={() => onDelete(url)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </Tooltip>
      <Button className="sm:hidden" size="icon" variant="ghost" aria-label="More URL actions"><MoreHorizontal className="h-4 w-4" /></Button>
      <span className="sr-only">Quick actions for {url.shortUrl}</span>
    </div>
  );
});

function ShareMenu({ url, onShare }: { url: ShortenedUrl; onShare: (url: ShortenedUrl, channel: string) => Promise<void> }) {
  const items = ["Copy Link", "WhatsApp", "Facebook", "X", "LinkedIn", "Telegram", "Email"];
  if ("share" in navigator) items.unshift("Native");
  return (
    <div className="absolute right-0 top-12 z-20 w-48 rounded-md border bg-card p-1 shadow-panel" role="menu">
      {items.map((item) => (
        <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" key={item} type="button" role="menuitem" onClick={() => void onShare(url, item)}>
          {item === "Email" ? <Mail className="h-4 w-4" /> : item === "WhatsApp" || item === "Telegram" ? <MessageCircle className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          {item}
        </button>
      ))}
    </div>
  );
}

function ConfirmationDialog({ confirm, onCancel, onConfirm }: { confirm: PendingConfirm | null; onCancel: () => void; onConfirm: () => void }) {
  const title = confirm?.type === "delete" ? "Delete URLs?" : confirm?.type === "archive" ? "Archive URLs?" : "Restore URLs?";
  const verb = confirm?.type === "delete" ? "Delete" : confirm?.type === "archive" ? "Archive" : "Restore";
  return (
    <Dialog open={Boolean(confirm)} title={title} description={`${confirm?.urls.length ?? 0} selected URL${confirm?.urls.length === 1 ? "" : "s"} will be ${verb.toLowerCase()}d.`} onOpenChange={(open) => (!open ? onCancel() : undefined)}>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant={confirm?.type === "delete" ? "destructive" : "default"} onClick={onConfirm}>{verb}</Button>
      </div>
    </Dialog>
  );
}

function QrDialog({ url, onClose, onCopy, onDownload }: { url: ShortenedUrl | null; onClose: () => void; onCopy: (url: ShortenedUrl) => Promise<void>; onDownload: (url: ShortenedUrl, format: "svg" | "png") => Promise<void> }) {
  const svg = url ? createQrSvg(url.shortUrl) : "";
  return (
    <Dialog open={Boolean(url)} title="QR Code" {...(url ? { description: url.shortUrl } : {})} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      {url ? (
        <div className="space-y-4">
          <div className="mx-auto grid h-64 w-64 place-items-center rounded-lg border bg-white p-4" dangerouslySetInnerHTML={{ __html: svg }} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => void onCopy(url)}><Copy className="h-4 w-4" />Copy QR Image</Button>
            <Button variant="outline" onClick={() => void onDownload(url, "svg")}><Download className="h-4 w-4" />Download SVG</Button>
            <Button onClick={() => void onDownload(url, "png")}><Download className="h-4 w-4" />Download PNG</Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

function DashboardWidgetFrame({
  children,
  dragging,
  label,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
}: {
  children: ReactNode;
  dragging: boolean;
  label: string;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  return (
    <section aria-label={label} className={dragging ? "opacity-60" : ""} draggable onDragEnd={onDragEnd} onDragOver={onDragOver} onDragStart={onDragStart} onDrop={onDrop}>
      <div className="mb-2 flex items-center justify-end">
        <Tooltip label={`Drag to reorder ${label}`}>
          <button className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" type="button" aria-label={`Drag to reorder ${label}`}>
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
      {children}
    </section>
  );
}

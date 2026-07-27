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
  CalendarClock,
  Check,
  CircleAlert,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Globe2,
  GripVertical,
  Info,
  Link2,
  Loader2,
  Lock,
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
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { CopyButton } from "@/components/common/CopyButton";
import { DashboardSkeleton } from "@/components/common/Skeleton";
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
import { authenticatedDownload, getApiErrorMessage, isAuthorizationError } from "@/services/api";
import { clearAuthSession, getAuthSession } from "@/services/authStorage";
import { DASHBOARD_WIDGET_LABELS, type DashboardWidgetId } from "@/services/dashboardPreferences";
import {
  createShortenedUrl,
  deleteShortenedUrl,
  listShortenedUrls,
  updateShortenedUrl,
  getUrlExportUrl,
  type ShortenedUrl,
} from "@/services/urls";

interface FormErrors {
  originalUrl?: string;
  customAlias?: string;
  title?: string;
  notes?: string;
  password?: string;
  form?: string;
}

interface Notice {
  id: number;
  tone: "success" | "info" | "warning" | "error";
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

function getHostname(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function getFaviconUrl(value: string) {
  const hostname = getHostname(value);
  return hostname ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64` : "";
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
    notes: url.notes ?? "",
    isPasswordProtected: url.isPasswordProtected ?? false,
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
  const [exporting, setExporting] = useState("");
  const [creating, setCreating] = useState(false);
  const [workingIds, setWorkingIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [listError, setListError] = useState("");
  const [notices, setNotices] = useState<Notice[]>([]);
  const [draggedWidget, setDraggedWidget] = useState<DashboardWidgetId | null>(null);
  const [search, setSearch] = useState(() => localStorage.getItem(SEARCH_STORAGE_KEY) ?? "");
  const [sort, setSort] = useState<SortKey>(() => (localStorage.getItem(SORT_STORAGE_KEY) as SortKey | null) ?? "newest");
  const [filters, setFilters] = useState<FilterKey[]>([]);
  const [pinFavorites, setPinFavorites] = useState(() => localStorage.getItem(PIN_FAVORITES_KEY) === "true");
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState<ShortenedUrl | null>(null);
  const [editingUrl, setEditingUrl] = useState<ShortenedUrl | null>(null);
  const [editing, setEditing] = useState(false);
  const [openMenuId, setOpenMenuId] = useState("");
  const { preferences, setWidgetOrder } = useDashboardPreferences();
  const errorId = useId();
  const debouncedSearch = useDebouncedValue(search);

  const totalClicks = useMemo(() => urls.reduce((total, url) => total + url.clickCount, 0), [urls]);
  const activeCount = useMemo(() => urls.filter((url) => url.isActive && !url.isArchived && !isExpired(url)).length, [urls]);
  const qrCount = useMemo(() => urls.filter((url) => url.hasQrCode).length, [urls]);
  const favoriteCount = useMemo(() => urls.filter((url) => url.isFavorite).length, [urls]);
  const clickRate = urls.length ? Math.round((totalClicks / urls.length) * 10) / 10 : 0;
  const recentActivityCount = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return urls.filter((url) => new Date(url.updatedAt).getTime() >= sevenDaysAgo || (url.lastClickedAt && new Date(url.lastClickedAt).getTime() >= sevenDaysAgo)).length;
  }, [urls]);
  const expiringSoonCount = useMemo(() => {
    const now = Date.now();
    const nextWeek = now + 7 * 24 * 60 * 60 * 1000;
    return urls.filter((url) => url.expiresAt && new Date(url.expiresAt).getTime() >= now && new Date(url.expiresAt).getTime() <= nextWeek).length;
  }, [urls]);
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

  const showNotice = useCallback((nextNotice: Omit<Notice, "id">) => {
    setNotices((current) => [...current, { ...nextNotice, id: Date.now() + Math.random() }].slice(-4));
  }, []);

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
    if (!notices.length) return undefined;
    const timer = window.setTimeout(() => setNotices((current) => current.slice(1)), 4000);
    return () => window.clearTimeout(timer);
  }, [notices]);

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
      if (event.key === "/") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('[aria-label="Search URLs"]')?.focus();
        return;
      }
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

  function validateForm(originalUrl: string, customAlias: string, title: string, notes: string, password: string) {
    const nextErrors: FormErrors = {};

    if (!originalUrl) nextErrors.originalUrl = "Long URL is required.";
    else if (!isValidHttpUrl(originalUrl)) nextErrors.originalUrl = "Enter a valid http or https URL.";
    if (customAlias && !isValidCustomAlias(customAlias)) {
      nextErrors.customAlias = "Use 3-64 letters, numbers, underscores, or hyphens, and avoid reserved aliases.";
    }
    if (title.length > 140) nextErrors.title = "Title cannot exceed 140 characters.";
    if (notes.length > 1000) nextErrors.notes = "Notes cannot exceed 1000 characters.";
    if (password && password.length < 6) nextErrors.password = "Password must be at least 6 characters.";

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
    const notes = String(form.get("notes") ?? "").trim();
    const expiresAt = String(form.get("expiresAt") ?? "");
    const activatesAt = String(form.get("activatesAt") ?? "");
    const deactivatesAt = String(form.get("deactivatesAt") ?? "");
    const password = String(form.get("password") ?? "");
    const validationErrors = validateForm(originalUrl, customAlias, title, notes, password);

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
        ...(notes ? { notes } : {}),
        ...(expiresAt ? { expiresAt } : {}),
        ...(activatesAt ? { activatesAt } : {}),
        ...(deactivatesAt ? { deactivatesAt } : {}),
        ...(password ? { password } : {}),
      });
      setUrls((current) => [normalizeUrl(response.url), ...current.filter((url) => url.id !== response.url.id)]);
      formElement.reset();
      showNotice({ tone: "success", message: `Link created: ${response.url.shortUrl}` });
      const duplicate = response.duplicates?.[0];
      if (duplicate) {
        showNotice({ tone: "warning", message: `Duplicate destination detected: ${duplicate.shortUrl}` });
      }
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

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUrl || !accessToken || editing) return;

    const form = new FormData(event.currentTarget);
    const originalUrl = String(form.get("originalUrl") ?? "").trim();
    const customAlias = String(form.get("customAlias") ?? "").trim();
    const title = String(form.get("title") ?? "").trim();
    const notes = String(form.get("notes") ?? "").trim();
    const expiresAt = String(form.get("expiresAt") ?? "");
    const activatesAt = String(form.get("activatesAt") ?? "");
    const deactivatesAt = String(form.get("deactivatesAt") ?? "");
    const password = String(form.get("password") ?? "");
    const validationErrors = validateForm(originalUrl, customAlias, title, notes, password);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setEditing(true);
    setErrors({});

    try {
      const response = await updateShortenedUrl(accessToken, editingUrl.id, {
        originalUrl,
        ...(customAlias ? { customAlias } : {}),
        ...(title ? { title } : {}),
        ...(notes ? { notes } : {}),
        ...(expiresAt ? { expiresAt } : {}),
        ...(activatesAt ? { activatesAt } : {}),
        ...(deactivatesAt ? { deactivatesAt } : {}),
        ...(password ? { password } : {}),
      });
      setUrls((current) => current.map((url) => (url.id === editingUrl.id ? normalizeUrl(response.url) : url)));
      setEditingUrl(null);
      showNotice({ tone: "success", message: "URL updated" });
    } catch (error) {
      if (isAuthorizationError(error)) {
        endSession();
        return;
      }

      setErrors({ form: getErrorMessage(error) });
    } finally {
      setEditing(false);
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

  async function exportUrls(format: "csv" | "excel" | "json") {
    if (!accessToken || exporting) return;

    setExporting(format);
    try {
      const blob = await authenticatedDownload(getUrlExportUrl(format), accessToken);
      downloadFile(`shortly-urls.${format === "excel" ? "xls" : format}`, blob);
      showNotice({ tone: "success", message: `${format.toUpperCase()} export downloaded` });
    } catch (error) {
      showNotice({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setExporting("");
    }
  }

  if (initialLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-5 shadow-xs sm:p-6" aria-labelledby="dashboard-title">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0">
            <Badge variant="muted">Dashboard overview</Badge>
            <h1 id="dashboard-title" className="mt-3 text-3xl font-bold">
              Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Welcome back{session?.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}. Create, monitor, and organize your short links from one focused workspace.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                {formatNumber(favoriteCount)} favorites pinned
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1">
                <CalendarClock className="h-4 w-4 text-warning" aria-hidden="true" />
                {formatNumber(expiringSoonCount)} expiring soon
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button onClick={() => document.getElementById("create-link")?.scrollIntoView({ block: "start", behavior: "smooth" })}>
              <Plus className="h-4 w-4" />
              New URL
            </Button>
          {(["csv", "excel", "json"] as const).map((format) => (
            <Button disabled={Boolean(exporting)} key={format} variant="outline" onClick={() => void exportUrls(format)}>
              <Download className="h-4 w-4" />
              {format.toUpperCase()}
            </Button>
          ))}
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
      </section>

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
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                <StatCard detail="Owned by your account" icon={Link2} label="Total Links" meta={`${favoriteCount} favorite`} value={urls.length} />
                <StatCard detail="Across all short links" icon={BarChart3} label="Total Clicks" meta="Lifetime" tone="info" value={totalClicks} />
                <StatCard detail="Available for redirects" icon={Check} label="Active Links" meta={`${urls.length - activeCount} inactive`} tone="success" value={activeCount} />
                <StatCard detail="Ready to share offline" icon={QrCode} label="QR Codes" meta={`${Math.round((qrCount / Math.max(urls.length, 1)) * 100)}% coverage`} tone="warning" value={qrCount} />
                <StatCard detail="Average clicks per link" icon={Globe2} label="Click Rate" meta="Per URL" value={clickRate.toLocaleString()} />
                <StatCard detail="Updated or clicked this week" icon={RefreshCw} label="Recent Activity" meta="7 days" tone="muted" value={recentActivityCount} />
              </div>
            ) : null}

            {widgetId === "create-link" ? (
              <Card id="create-link" className="scroll-mt-24 overflow-hidden">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle>Create short URL</CardTitle>
                      <CardDescription>Paste a destination, add context, and configure optional controls before publishing.</CardDescription>
                    </div>
                    <Badge variant="default">Advanced options included</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <form className="space-y-5 pt-6" aria-describedby={errors.form ? errorId : undefined} noValidate onSubmit={handleCreate}>
                    {errors.form ? <Alert id={errorId}>{errors.form}</Alert> : null}
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto] xl:items-start">
                      <Field label="Long URL" error={errors.originalUrl} id="dashboard-original-url" hint="Use a full http or https URL.">
                        <div className="relative">
                          <Link2 className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9" id="dashboard-original-url" name="originalUrl" type="url" placeholder="https://example.com/very/long/url" autoComplete="url" disabled={creating} inputMode="url" required />
                        </div>
                      </Field>
                      <Field label="Custom alias" error={errors.customAlias} id="dashboard-custom-alias" hint="Optional, 3-64 characters.">
                        <Input id="dashboard-custom-alias" name="customAlias" placeholder="launch" disabled={creating} maxLength={64} pattern="[A-Za-z0-9_-]{3,64}" />
                      </Field>
                      <Field label="Title" error={errors.title} id="dashboard-title-input" hint="Helps identify the link later.">
                        <Input id="dashboard-title-input" name="title" placeholder="Campaign launch" disabled={creating} maxLength={140} />
                      </Field>
                      <Button className="w-full xl:mt-7 xl:w-auto" disabled={creating} type="submit">
                        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Generate short URL
                      </Button>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-3">
                      <Field label="Scheduled activation" error={undefined} id="dashboard-activates-at" hint="Keep blank to activate immediately.">
                        <Input id="dashboard-activates-at" name="activatesAt" type="datetime-local" disabled={creating} />
                      </Field>
                      <Field label="Scheduled deactivation" error={undefined} id="dashboard-deactivates-at" hint="Pause access after a campaign window.">
                        <Input id="dashboard-deactivates-at" name="deactivatesAt" type="datetime-local" disabled={creating} />
                      </Field>
                      <Field label="Expiration" error={undefined} id="dashboard-expires-at" hint="Expire the short URL automatically.">
                        <Input id="dashboard-expires-at" name="expiresAt" type="datetime-local" disabled={creating} />
                      </Field>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                      <Field label="Link notes" error={errors.notes} id="dashboard-notes" hint="Private notes for teammates and future you.">
                        <textarea
                          className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground hover:border-primary/60 focus-visible:border-ring"
                          id="dashboard-notes"
                          name="notes"
                          placeholder="Internal campaign notes"
                          maxLength={1000}
                          disabled={creating}
                        />
                      </Field>
                      <Field label="Password protection" error={errors.password} id="dashboard-password" hint="Optional, minimum 6 characters.">
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9" id="dashboard-password" name="password" type="password" placeholder="Optional password" minLength={6} maxLength={128} disabled={creating} />
                        </div>
                      </Field>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : null}

            {widgetId === "url-list" ? (
              <Card id="recent-links" className="min-w-0 overflow-hidden scroll-mt-24">
                <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Your URLs</CardTitle>
                    <CardDescription>Search, sort, filter, share, archive, and manage links from one place.</CardDescription>
                  </div>
                  <Badge variant="muted">{formatNumber(filteredUrls.length)} shown</Badge>
                </CardHeader>
                <CardContent className="min-w-0 space-y-4">
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
                    onAnalytics={(url) => navigate(`/analytics?url=${encodeURIComponent(url.id)}`)}
                    onCopy={bulkCopy}
                    onDelete={(url) => setConfirm({ type: "delete", urls: [url] })}
                    onEdit={(url) => {
                      setErrors({});
                      setEditingUrl(url);
                    }}
                    onGenerateQr={generateQr}
                    onCreate={() => document.getElementById("create-link")?.scrollIntoView({ block: "start", behavior: "smooth" })}
                    onReset={resetControls}
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

      <EditUrlDialog
        editing={editing}
        errors={errors}
        url={editingUrl}
        onCancel={() => {
          setEditingUrl(null);
          setErrors({});
        }}
        onSubmit={handleEdit}
      />

      <QrDialog
        url={qrPreviewUrl}
        onClose={() => setQrPreviewUrl(null)}
        onCopy={copyQrImage}
        onDownload={downloadQr}
      />

      {notices.length ? (
        <div className="fixed bottom-4 left-4 right-4 z-50 grid max-w-md gap-2 sm:left-auto" aria-live="polite">
          {notices.map((notice) => (
            <div
              className={cn(
                "motion-enter rounded-lg border bg-card p-4 text-sm shadow-panel transition-[border-color,box-shadow,opacity,transform] duration-base ease-standard",
                notice.tone === "success" && "border-success/30",
                notice.tone === "info" && "border-primary/30",
                notice.tone === "warning" && "border-warning/40",
                notice.tone === "error" && "border-destructive/30",
              )}
              key={notice.id}
              role={notice.tone === "error" ? "alert" : "status"}
            >
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{notice.message}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Field({ children, error, hint, id, label }: { children: ReactNode; error: string | undefined; hint?: string; id: string; label: string }) {
  const descriptionId = hint || error ? `${id}-description` : undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error ? (
        <p className="text-xs text-muted-foreground" id={descriptionId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" id={descriptionId}>
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
          <Input className="pl-9 pr-24" value={search} placeholder="Search original, short URL, alias, title, or tags" aria-label="Search URLs" onChange={(event) => onSearch(event.target.value)} />
          <kbd className="pointer-events-none absolute right-12 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-[0.7rem] font-medium text-muted-foreground sm:inline-flex">
            /
          </kbd>
          {search ? (
            <Button className="absolute right-1 top-1 h-9 w-9" size="icon" variant="ghost" aria-label="Clear search" onClick={() => onSearch("")}>
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <select className="min-h-11 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors hover:border-primary/60 focus-visible:border-ring" aria-label="Sort URLs" value={sort} onChange={(event) => onSort(event.target.value as SortKey)}>
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
      {filters.length || search ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/25 p-2 text-sm" aria-live="polite">
          <span className="px-1 font-medium text-muted-foreground">Active filters</span>
          {search ? <Badge variant="muted">Search: {search}</Badge> : null}
          {filters.map((filter) => (
            <button
              className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              key={filter}
              type="button"
              onClick={() => onFilter(filter)}
            >
              {filterOptions.find((option) => option.value === filter)?.label}
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          ))}
          <Button size="sm" variant="ghost" onClick={onReset}>
            Clear filters
          </Button>
        </div>
      ) : null}
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
    <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 transition-colors", selectedCount ? "bg-primary/5 border-primary/20" : "bg-muted/30")}>
      <p className="text-sm font-medium" aria-live="polite">
        {selectedCount ? `${selectedCount} selected` : "Select URLs to unlock bulk actions"}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={disabled} size="sm" variant="outline" onClick={onCopy}><Copy className="h-4 w-4" />Copy</Button>
        <Button disabled={disabled} size="sm" variant="outline" onClick={onArchive}><Archive className="h-4 w-4" />Archive</Button>
        <Button disabled={disabled} size="sm" variant="outline" onClick={onRestore}><ArchiveRestore className="h-4 w-4" />Restore</Button>
        <Button disabled={disabled} size="sm" variant="destructive" onClick={onDelete}><Trash2 className="h-4 w-4" />Delete</Button>
      </div>
    </div>
  );
}

function DashboardEmptyState({
  description,
  icon: Icon,
  primaryAction,
  secondaryAction,
  title,
}: {
  description: string;
  icon: typeof CircleAlert;
  primaryAction?: { label: string; onClick: () => void } | undefined;
  secondaryAction?: { label: string; onClick: () => void } | undefined;
  title: string;
}) {
  return (
    <Card className="group motion-enter flex min-h-72 flex-col items-center justify-center p-6 text-center sm:p-8" role="status">
      <span className="grid h-12 w-12 place-items-center rounded-md border bg-accent text-accent-foreground transition-transform duration-base ease-standard motion-safe:group-hover:scale-105">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {primaryAction || secondaryAction ? (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {primaryAction ? <Button onClick={primaryAction.onClick}>{primaryAction.label}</Button> : null}
          {secondaryAction ? (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
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
  onAnalytics: (url: ShortenedUrl) => void;
  onCopy: (urls: ShortenedUrl[]) => void;
  onDelete: (url: ShortenedUrl) => void;
  onEdit: (url: ShortenedUrl) => void;
  onGenerateQr: (url: ShortenedUrl) => void;
  onCreate: () => void;
  onReset: () => void;
  onRestore: (url: ShortenedUrl) => void;
  onSelect: (url: ShortenedUrl, selected: boolean) => void;
  onShare: (url: ShortenedUrl, channel: string) => Promise<void>;
  onToggleFavorite: (url: ShortenedUrl) => void;
}) {
  if (!props.urls.length) {
    const favoriteOnly = props.filters.includes("favorites");
    const archiveOnly = props.filters.includes("archived");
    return (
      <DashboardEmptyState
        description={props.query ? "Adjust your search or clear filters to see more URLs." : favoriteOnly ? "Star a URL to collect it here." : archiveOnly ? "Archived URLs remain recoverable and will appear here." : "Create your first short URL to see it appear here immediately."}
        icon={CircleAlert}
        primaryAction={!props.query && !favoriteOnly && !archiveOnly ? { label: "Create URL", onClick: props.onCreate } : undefined}
        secondaryAction={props.query || props.filters.length ? { label: "Clear filters", onClick: props.onReset } : undefined}
        title={props.query ? "No search results" : favoriteOnly ? "No favorites yet" : archiveOnly ? "No archived URLs" : "No URLs yet"}
      />
    );
  }

  return (
    <>
      <div className="hidden min-w-0 xl:block">
        <Table>
          <caption className="sr-only">Shortened URLs</caption>
          <thead>
            <tr className="border-b">
              <Th className="w-12">Select</Th>
              <Th className="w-[30%]">URL</Th>
              <Th className="w-[18%]">Short URL</Th>
              <Th className="w-[15%]">Activity</Th>
              <Th className="w-[15%]">Dates</Th>
              <Th className="w-[22%] text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {props.urls.map((url) => (
              <UrlRow key={url.id} url={url} {...props} />
            ))}
          </tbody>
        </Table>
      </div>
      <div className="grid min-w-0 gap-3 xl:hidden">
        {props.urls.map((url) => (
          <UrlCard key={url.id} url={url} {...props} />
        ))}
      </div>
    </>
  );
}

function UrlRow(props: Parameters<typeof UrlCard>[0]) {
  const { query, selectedIds, url, workingIds, onSelect } = props;
  const selected = selectedIds.includes(url.id);
  return (
    <tr
      className={cn(
        "border-b transition-[background-color,box-shadow,opacity] duration-base ease-standard last:border-0 hover:bg-muted/40",
        selected && "bg-primary/5 shadow-[inset_3px_0_0_hsl(var(--primary))]",
        url.isArchived && "opacity-70",
      )}
      aria-selected={selected}
    >
      <Td>
        <input aria-label={`Select ${url.shortUrl}`} checked={selectedIds.includes(url.id)} type="checkbox" onChange={(event) => onSelect(url, event.target.checked)} />
      </Td>
      <Td>
        <UrlIdentity query={query} url={url} />
      </Td>
      <Td>
        <p className="max-w-full truncate font-mono text-xs text-muted-foreground"><Highlight query={query} text={url.shortUrl} /></p>
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
  onAnalytics: (url: ShortenedUrl) => void;
  onCopy: (urls: ShortenedUrl[]) => void;
  onDelete: (url: ShortenedUrl) => void;
  onEdit: (url: ShortenedUrl) => void;
  onGenerateQr: (url: ShortenedUrl) => void;
  onRestore: (url: ShortenedUrl) => void;
  onSelect: (url: ShortenedUrl, selected: boolean) => void;
  onShare: (url: ShortenedUrl, channel: string) => Promise<void>;
  onToggleFavorite: (url: ShortenedUrl) => void;
}) {
  const { query, selectedIds, url, workingIds, onSelect } = props;
  return (
    <Card className={cn("p-4 transition-all duration-base hover:-translate-y-0.5 hover:shadow-soft", selectedIds.includes(url.id) && "border-primary/50 bg-primary/5", url.isArchived && "opacity-70")}>
      <div className="flex items-start gap-3">
        <input className="mt-1" aria-label={`Select ${url.shortUrl}`} checked={selectedIds.includes(url.id)} type="checkbox" onChange={(event) => onSelect(url, event.target.checked)} />
        <div className="min-w-0 flex-1 space-y-3">
          <UrlIdentity query={query} url={url} />
          <p className="break-all rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground"><Highlight query={query} text={url.shortUrl} /></p>
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
  const faviconUrl = getFaviconUrl(url.originalUrl);
  const hostname = getHostname(url.originalUrl);

  return (
    <div className="flex min-w-0 max-w-full gap-3 overflow-hidden">
      <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted text-xs font-semibold text-muted-foreground">
        {faviconUrl ? <img alt="" className="h-5 w-5" src={faviconUrl} loading="lazy" referrerPolicy="no-referrer" /> : hostname.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 max-w-full flex-1 space-y-2 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 max-w-full break-all font-medium"><Highlight query={query} text={getUrlTitle(url)} /></p>
          {url.isFavorite ? <Badge variant="warning">Favorite</Badge> : null}
          {url.isArchived ? <Badge variant="muted">Archived</Badge> : null}
          {isExpired(url) ? <Badge variant="destructive">Expired</Badge> : url.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="warning">Inactive</Badge>}
          {url.activatesAt && new Date(url.activatesAt) > new Date() ? <Badge variant="warning">Scheduled</Badge> : null}
          {url.isPasswordProtected ? <Badge variant="muted">Protected</Badge> : null}
          {url.hasQrCode ? <Badge variant="default">QR</Badge> : null}
        </div>
        <div className="space-y-1">
          <p className="max-w-full truncate text-sm text-muted-foreground lg:max-w-lg" title={url.originalUrl}>
            <Highlight query={query} text={url.originalUrl} />
          </p>
          <p className="text-xs text-muted-foreground">{hostname}</p>
        </div>
        {url.tags.length ? (
          <div className="flex flex-wrap gap-1">
            {url.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="muted">
                <Highlight query={query} text={tag} />
              </Badge>
            ))}
            {url.tags.length > 4 ? <Badge variant="muted">+{url.tags.length - 4}</Badge> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Activity({ url }: { url: ShortenedUrl }) {
  return (
    <div className="flex min-w-0 flex-wrap gap-2 text-xs">
      <Badge variant="muted">{formatNumber(url.clickCount)} clicks</Badge>
      <Badge variant="muted">{formatNumber(url.shareCount)} shares</Badge>
      <span className="min-w-0 break-words text-muted-foreground">Last clicked {formatDate(url.lastClickedAt)}</span>
    </div>
  );
}

function Dates({ url }: { url: ShortenedUrl }) {
  return (
    <div className="text-xs text-muted-foreground">
      <p>Created {formatDate(url.createdAt)}</p>
      <p>Updated {formatDate(url.updatedAt)}</p>
      {url.activatesAt ? <p>Starts {formatDate(url.activatesAt)}</p> : null}
      {url.deactivatesAt ? <p>Stops {formatDate(url.deactivatesAt)}</p> : null}
      {url.expiresAt ? <p>Expires {formatDate(url.expiresAt)}</p> : null}
    </div>
  );
}

const UrlActions = memo(function UrlActions({
  busy,
  openMenuId,
  setOpenMenuId,
  url,
  onArchive,
  onAnalytics,
  onDelete,
  onEdit,
  onGenerateQr,
  onRestore,
  onShare,
  onToggleFavorite,
}: Parameters<typeof UrlCard>[0] & { busy: boolean }) {
  const menuOpen = openMenuId === url.id;
  return (
    <div className="flex max-w-full flex-wrap justify-end gap-1">
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
      <Tooltip label="View analytics">
        <Button aria-label={`View analytics for ${url.shortUrl}`} size="icon" variant="ghost" onClick={() => onAnalytics(url)}>
          <BarChart3 className="h-4 w-4" />
        </Button>
      </Tooltip>
      <Tooltip label="Edit URL">
        <Button aria-label={`Edit ${url.shortUrl}`} disabled={busy} size="icon" variant="ghost" onClick={() => onEdit(url)}>
          <Edit3 className="h-4 w-4" />
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

function toDateTimeInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function EditUrlDialog({
  editing,
  errors,
  url,
  onCancel,
  onSubmit,
}: {
  editing: boolean;
  errors: FormErrors;
  url: ShortenedUrl | null;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={Boolean(url)} title="Edit URL" description={url?.shortUrl ?? "Update URL details."} onOpenChange={(open) => (!open ? onCancel() : undefined)}>
      {url ? (
        <form className="space-y-4" noValidate onSubmit={onSubmit}>
          {errors.form ? <Alert>{errors.form}</Alert> : null}
          <Field label="Long URL" error={errors.originalUrl} id="edit-original-url" hint="Keep this as a full http or https URL.">
            <Input id="edit-original-url" name="originalUrl" type="url" defaultValue={url.originalUrl} disabled={editing} inputMode="url" required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Custom alias" error={errors.customAlias} id="edit-custom-alias" hint="Optional readable slug.">
              <Input id="edit-custom-alias" name="customAlias" defaultValue={url.customAlias ?? ""} disabled={editing} maxLength={64} pattern="[A-Za-z0-9_-]{3,64}" />
            </Field>
            <Field label="Title" error={errors.title} id="edit-title" hint="Visible only in your dashboard.">
              <Input id="edit-title" name="title" defaultValue={url.title ?? ""} disabled={editing} maxLength={140} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Activates" error={undefined} id="edit-activates-at">
              <Input id="edit-activates-at" name="activatesAt" type="datetime-local" defaultValue={toDateTimeInput(url.activatesAt)} disabled={editing} />
            </Field>
            <Field label="Deactivates" error={undefined} id="edit-deactivates-at">
              <Input id="edit-deactivates-at" name="deactivatesAt" type="datetime-local" defaultValue={toDateTimeInput(url.deactivatesAt)} disabled={editing} />
            </Field>
            <Field label="Expires" error={undefined} id="edit-expires-at">
              <Input id="edit-expires-at" name="expiresAt" type="datetime-local" defaultValue={toDateTimeInput(url.expiresAt)} disabled={editing} />
            </Field>
          </div>
          <Field label="Notes" error={errors.notes} id="edit-notes">
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground hover:border-primary/60 focus-visible:border-ring"
              id="edit-notes"
              name="notes"
              defaultValue={url.notes ?? ""}
              disabled={editing}
              maxLength={1000}
            />
          </Field>
          <Field label="Change password" error={errors.password} id="edit-password" hint="Leave blank to keep the current password setting.">
            <Input id="edit-password" name="password" type="password" disabled={editing} minLength={6} maxLength={128} placeholder={url.isPasswordProtected ? "Protected" : "Optional password"} />
          </Field>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button loading={editing} type="submit">
              Save changes
            </Button>
          </div>
        </form>
      ) : null}
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

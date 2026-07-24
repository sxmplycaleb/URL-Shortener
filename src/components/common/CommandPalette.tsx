import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Archive, BarChart3, Check, Command, CornerDownLeft, Link2, LogOut, Search, Settings, Star } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { keyboardShortcuts } from "@/lib/keyboardShortcuts";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  onLogout: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  icon: typeof Search;
  action: () => void;
}

export function CommandPalette({ onLogout }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>(() => readRecentCommands());
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<CommandItem[]>(
    () => [
      {
        id: "dashboard",
        label: "Dashboard",
        description: "Open your link dashboard.",
        keywords: ["home", "links", "recent links"],
        icon: Link2,
        action: () => navigate("/dashboard"),
      },
      {
        id: "analytics",
        label: "Analytics",
        description: "Review link performance.",
        keywords: ["charts", "clicks", "reports"],
        icon: BarChart3,
        action: () => navigate("/analytics"),
      },
      {
        id: "settings",
        label: "Settings",
        description: "Edit profile and account settings.",
        keywords: ["profile", "account"],
        icon: Settings,
        action: () => navigate("/settings"),
      },
      {
        id: "dashboard-settings",
        label: "Dashboard Settings",
        description: "Customize widgets, shortcuts, and accessibility preferences.",
        keywords: ["layout", "widgets", "preferences"],
        icon: Settings,
        action: () => navigate("/settings/dashboard"),
      },
      {
        id: "create-link",
        label: "Create Link",
        description: "Jump to the dashboard link form.",
        keywords: ["shorten", "new", "url"],
        icon: Link2,
        action: () => navigate("/dashboard#create-link"),
      },
      {
        id: "logout",
        label: "Logout",
        description: "Sign out of this account.",
        keywords: ["sign out", "exit"],
        icon: LogOut,
        action: onLogout,
      },
      {
        id: "recent-links",
        label: "Recent Links",
        description: "Open the dashboard URL list.",
        keywords: ["urls", "history", "list"],
        icon: Archive,
        action: () => navigate("/dashboard#recent-links"),
      },
    ],
    [navigate, onLogout],
  );

  const results = useMemo(() => {
    return commands
      .map((command) => ({ command, score: scoreCommand(command, query) }))
      .filter((item) => item.score > 0)
      .sort((left, right) => {
        if (!query && recentIds.includes(left.command.id) !== recentIds.includes(right.command.id)) {
          return recentIds.includes(left.command.id) ? -1 : 1;
        }
        return right.score - left.score || left.command.label.localeCompare(right.command.label);
      })
      .map((item) => item.command);
  }, [commands, query, recentIds]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches("input, textarea, select, [contenteditable=true]");

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        return;
      }

      if (!typing && (event.key === "?" || (event.shiftKey && event.key === "/"))) {
        event.preventDefault();
        setShortcutsOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, location.pathname]);

  const runCommand = useCallback(
    (command: CommandItem) => {
      command.action();
      const nextRecent = [command.id, ...recentIds.filter((id) => id !== command.id)].slice(0, 5);
      setRecentIds(nextRecent);
      localStorage.setItem("shortly.commandPalette.recent", JSON.stringify(nextRecent));
      setOpen(false);
    },
    [recentIds],
  );

  function handlePaletteKeyDown(event: ReactKeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, results.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    }
    if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      runCommand(results[activeIndex]);
    }
  }

  return (
    <>
      <Dialog open={open} title="Command Palette" description="Search navigation and common actions." onOpenChange={setOpen}>
        <div className="space-y-3" onKeyDown={handlePaletteKeyDown}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              ref={inputRef}
              aria-activedescendant={results[activeIndex]?.id ? `command-${results[activeIndex].id}` : undefined}
              aria-controls="command-results"
              aria-label="Search commands"
              className="pl-9"
              placeholder="Search commands..."
              role="combobox"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="max-h-80 space-y-1 overflow-y-auto" id="command-results" role="listbox">
            {results.length ? (
              results.map((command, index) => (
                <button
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors",
                    index === activeIndex ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                  id={`command-${command.id}`}
                  key={command.id}
                  role="option"
                  type="button"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => runCommand(command)}
                >
                  <command.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      <HighlightedText query={query} text={command.label} />
                    </span>
                    <span className={cn("block text-xs", index === activeIndex ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {command.description}
                    </span>
                  </span>
                  {recentIds.includes(command.id) ? <Star className="h-4 w-4 shrink-0" aria-label="Recently used" /> : null}
                  {index === activeIndex ? <CornerDownLeft className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                </button>
              ))
            ) : (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No commands found.</p>
            )}
          </div>
        </div>
      </Dialog>

      <Dialog open={shortcutsOpen} title="Keyboard Shortcuts" description="Available shortcuts for faster dashboard work." onOpenChange={setShortcutsOpen}>
        <div className="grid gap-2">
          {keyboardShortcuts.map((shortcut) => (
            <div className="flex items-center justify-between gap-4 rounded-md border bg-background p-3" key={shortcut.keys}>
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              <kbd className="rounded-md border bg-muted px-2 py-1 text-xs font-semibold text-foreground">{shortcut.keys}</kbd>
            </div>
          ))}
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-success" aria-hidden="true" />
            Shortcuts avoid text fields so typing stays predictable.
          </p>
        </div>
      </Dialog>

      <div className="fixed bottom-5 left-5 z-30 hidden sm:block">
        <button
          className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-soft transition-colors hover:text-foreground"
          type="button"
          onClick={() => setOpen(true)}
        >
          <Command className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Ctrl K</span>
        </button>
      </div>
    </>
  );
}

function readRecentCommands() {
  try {
    const stored = localStorage.getItem("shortly.commandPalette.recent");
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

function scoreCommand(command: CommandItem, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return command.id === "create-link" ? 3 : 1;

  const haystack = [command.label, command.description, ...command.keywords].join(" ").toLowerCase();
  if (haystack.includes(normalizedQuery)) return 100 - haystack.indexOf(normalizedQuery);

  let cursor = 0;
  let score = 0;
  for (const char of normalizedQuery) {
    const index = haystack.indexOf(char, cursor);
    if (index === -1) return 0;
    score += Math.max(1, 10 - (index - cursor));
    cursor = index + 1;
  }
  return score;
}

function HighlightedText({ query, text }: { query: string; text: string }) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return <>{text}</>;
  const index = text.toLowerCase().indexOf(cleanQuery.toLowerCase());
  if (index === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-warning/30 px-0.5 text-inherit">{text.slice(index, index + cleanQuery.length)}</mark>
      {text.slice(index + cleanQuery.length)}
    </>
  );
}

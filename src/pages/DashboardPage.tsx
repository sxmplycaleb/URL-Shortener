import { useEffect, useMemo, useState } from "react";
import { BarChart3, CircleAlert, Clock, Link2, Plus, Search, Trash2 } from "lucide-react";

import { CopyButton } from "@/components/common/CopyButton";
import { EmptyState } from "@/components/common/EmptyState";
import { StatCard } from "@/components/common/StatCard";
import { CreateLinkForm } from "@/components/forms/CreateLinkForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { Tooltip } from "@/components/ui/tooltip";
import { formatNumber } from "@/lib/utils";
import { links } from "@/services/mockData";
import type { LinkStatus } from "@/types/link";

type LinkFilter = LinkStatus | "all";

const PAGE_SIZE = 3;
const LINK_FILTERS = new Set<string>(["all", "active", "expired", "blocked"]);

function isLinkFilter(value: string): value is LinkFilter {
  return LINK_FILTERS.has(value);
}

function getStatusVariant(status: LinkStatus): "success" | "warning" | "destructive" {
  if (status === "active") return "success";
  if (status === "blocked") return "destructive";
  return "warning";
}

export function DashboardPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LinkFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [createdUrl, setCreatedUrl] = useState("");
  const [page, setPage] = useState(1);
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      links.filter((link) => {
        const matchesQuery = [link.title, link.destinationUrl, link.shortCode].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );
        const matchesFilter = filter === "all" || link.status === filter;
        return matchesQuery && matchesFilter;
      }),
    [filter, normalizedQuery],
  );

  const totalClicks = useMemo(() => links.reduce((total, link) => total + link.clicks, 0), []);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleLinks = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [filter, query]);

  useEffect(() => {
    if (!createdUrl) return undefined;
    const timer = window.setTimeout(() => setCreatedUrl(""), 5000);
    return () => window.clearTimeout(timer);
  }, [createdUrl]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Create, search, filter, and manage your links.</p>
        </div>
        <Button aria-haspopup="dialog" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Create link
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard detail="+12% from last week" icon={Link2} label="Active links" value={String(links.filter((link) => link.status === "active").length)} />
        <StatCard detail="Across all tracked links" icon={BarChart3} label="Total clicks" value={formatNumber(totalClicks)} />
        <StatCard detail="1 link expires this month" icon={Clock} label="Expiring soon" value="1" />
      </div>

      <Card>
        <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Recent links</CardTitle>
            <CardDescription>Search links by title, destination, or alias.</CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative w-full sm:w-64">
              <label className="sr-only" htmlFor="dashboard-link-search">
                Search links
              </label>
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                id="dashboard-link-search"
                placeholder="Search links"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <select
              className="min-h-11 rounded-md border bg-background px-3 text-sm"
              aria-label="Filter links by status"
              value={filter}
              onChange={(event) => {
                if (isLinkFilter(event.target.value)) {
                  setFilter(event.target.value);
                }
              }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm">
            Offline-ready state: entered form data is preserved and create actions can be retried when the API reconnects.
          </div>
          {filtered.length ? (
            <>
              <div className="hidden md:block">
                <Table>
                  <caption className="sr-only">Recent shortened links</caption>
                  <thead>
                    <tr className="border-b">
                      <Th>Link</Th>
                      <Th>Status</Th>
                      <Th>Clicks</Th>
                      <Th>Created</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLinks.map((link) => (
                      <tr className="border-b last:border-0" key={link.id}>
                        <Td>
                          <div>
                            <p className="font-medium">{link.title}</p>
                            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{link.shortUrl}</p>
                          </div>
                        </Td>
                        <Td>
                          <Badge variant={getStatusVariant(link.status)}>{link.status}</Badge>
                        </Td>
                        <Td className="font-mono">{formatNumber(link.clicks)}</Td>
                        <Td>{link.createdAt}</Td>
                        <Td>
                          <div className="flex justify-end gap-1">
                            <CopyButton label={`Copy ${link.title}`} value={link.shortUrl} />
                            <Tooltip label="Delete link">
                              <Button aria-label={`Delete ${link.title}`} size="icon" variant="ghost">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </Tooltip>
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <div className="grid gap-3 md:hidden">
                {visibleLinks.map((link) => (
                  <Card className="p-4" key={link.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{link.title}</p>
                        <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{link.shortUrl}</p>
                      </div>
                      <Badge variant={getStatusVariant(link.status)}>{link.status}</Badge>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                      <span className="font-mono">{formatNumber(link.clicks)} clicks</span>
                      <div className="flex shrink-0 gap-1">
                        <CopyButton label={`Copy ${link.title}`} value={link.shortUrl} />
                        <Tooltip label="Delete link">
                          <Button aria-label={`Delete ${link.title}`} size="icon" variant="ghost">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </Tooltip>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {pageCount}
                </p>
                <div className="flex gap-2">
                  <Button disabled={page === 1} variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))}>
                    Previous
                  </Button>
                  <Button disabled={page === pageCount} variant="outline" onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState description="Try a different search term or clear filters to see all links." icon={CircleAlert} title="No links found" />
          )}
        </CardContent>
      </Card>

      <Dialog description="Add a destination, optional alias, and expiration date." open={modalOpen} title="Create short URL" onOpenChange={setModalOpen}>
        <CreateLinkForm
          onCreated={(url) => {
            setCreatedUrl(url);
            setModalOpen(false);
          }}
        />
      </Dialog>
      {createdUrl ? (
        <div className="fixed bottom-4 left-4 right-4 z-50 flex max-w-sm items-center gap-3 rounded-lg border bg-card p-4 shadow-panel sm:left-auto" role="status" aria-live="polite">
          <p className="min-w-0 flex-1 truncate text-sm">Created {createdUrl}</p>
          <CopyButton label="Copy created link" value={createdUrl} />
        </div>
      ) : null}
    </div>
  );
}

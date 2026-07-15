import { CircleAlert } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import type { AnalyticsStatus, LinkAnalyticsItem } from "@/services/analyticsService";

const statusVariant: Record<AnalyticsStatus, BadgeProps["variant"]> = {
  active: "success",
  expired: "warning",
  blocked: "destructive",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function AnalyticsTable({ links }: { links: LinkAnalyticsItem[] }) {
  if (!links.length) {
    return (
      <EmptyState
        description="Create your first short URL to start collecting click and audience analytics."
        icon={CircleAlert}
        title="No link analytics yet"
      />
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <caption className="sr-only">URL analytics by link</caption>
          <thead>
            <tr className="border-b">
              <Th>Short URL</Th>
              <Th>Original URL</Th>
              <Th>Total Clicks</Th>
              <Th>Created Date</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr className="border-b transition-colors last:border-0 hover:bg-muted/45" key={link.id}>
                <Td className="font-mono text-xs text-primary">{link.shortUrl}</Td>
                <Td>
                  <p className="max-w-md truncate font-medium" title={link.originalUrl}>
                    {link.originalUrl}
                  </p>
                </Td>
                <Td className="font-mono">{formatNumber(link.totalClicks)}</Td>
                <Td>{formatDate(link.createdAt)}</Td>
                <Td>
                  <Badge className="capitalize" variant={statusVariant[link.status]}>
                    {link.status}
                  </Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div className="grid gap-3 md:hidden">
        {links.map((link) => (
          <article className="rounded-md border p-4 transition-colors hover:bg-muted/40" key={link.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-all font-mono text-xs text-primary">{link.shortUrl}</p>
                <p className="mt-2 break-all text-sm font-medium">{link.originalUrl}</p>
              </div>
              <Badge className="shrink-0 capitalize" variant={statusVariant[link.status]}>
                {link.status}
              </Badge>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-sm">
              <span className="font-mono">{formatNumber(link.totalClicks)} clicks</span>
              <span className="text-muted-foreground">{formatDate(link.createdAt)}</span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

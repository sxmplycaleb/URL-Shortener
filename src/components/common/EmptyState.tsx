import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <Card className="group motion-enter flex min-h-56 flex-col items-center justify-center p-8 text-center" role="status">
      <span className="grid h-12 w-12 place-items-center rounded-md border bg-accent text-accent-foreground transition-[background-color,border-color,color,transform] duration-base ease-standard motion-safe:group-hover:scale-105">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
    </Card>
  );
}

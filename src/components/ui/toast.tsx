import * as React from "react";
import { AlertCircle, CheckCircle2, Info, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ToastTone = "default" | "success" | "warning" | "destructive";

interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  tone?: ToastTone;
  disabled?: boolean;
  loading?: boolean;
  onClose?: () => void;
}

const toneClasses: Record<ToastTone, string> = {
  default: "border-border bg-card text-card-foreground",
  success: "border-success/30 bg-card text-card-foreground",
  warning: "border-warning/30 bg-card text-card-foreground",
  destructive: "border-destructive/30 bg-card text-card-foreground",
};

const toneIcons = {
  default: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  destructive: AlertCircle,
};

export function Toast({
  title,
  description,
  tone = "default",
  disabled = false,
  loading = false,
  className,
  children,
  onClose,
  ...props
}: ToastProps) {
  const Icon = loading ? Loader2 : toneIcons[tone];

  return (
    <div
      role={tone === "destructive" ? "alert" : "status"}
      aria-live={tone === "destructive" ? "assertive" : "polite"}
      aria-disabled={disabled || undefined}
      aria-busy={loading || undefined}
      className={cn(
        "flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-panel transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
        toneClasses[tone],
        disabled ? "opacity-60" : "",
        loading ? "animate-pulse" : "",
        className,
      )}
      {...props}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", loading ? "animate-spin" : "")} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? <p className="text-sm font-semibold">{title}</p> : null}
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        {children}
      </div>
      {onClose ? (
        <Button aria-label="Dismiss notification" size="icon" variant="ghost" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

export function ToastViewport({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("fixed bottom-4 right-4 z-toast grid gap-2", className)} {...props} />;
}

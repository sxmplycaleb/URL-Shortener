import { Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="grid min-h-[50vh] place-items-center px-4" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-soft">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}

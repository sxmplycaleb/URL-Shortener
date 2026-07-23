import * as React from "react";
import { CheckCircle2, Circle, Eye, EyeOff } from "lucide-react";

import { buttonVariants } from "@/components/ui/buttonVariants";
import { Input } from "@/components/ui/input";
import { cn, getPasswordRequirements } from "@/lib/utils";

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  showRequirements?: boolean;
};

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showRequirements = false, value, id, "aria-describedby": ariaDescribedBy, disabled, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const restoreSelectionRef = React.useRef<{
      start: number | null;
      end: number | null;
      direction: "forward" | "backward" | "none" | null;
      focused: boolean;
    } | null>(null);
    const requirementsId = React.useId();
    const passwordValue = String(value ?? "");
    const requirements = getPasswordRequirements(passwordValue);

    const describedBy =
      [ariaDescribedBy, showRequirements ? requirementsId : undefined].filter(Boolean).join(" ") || undefined;

    function setInputRef(node: HTMLInputElement | null) {
      inputRef.current = node;

      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }

    function toggleVisibility() {
      const input = inputRef.current;
      restoreSelectionRef.current = input
        ? {
            start: input.selectionStart,
            end: input.selectionEnd,
            direction: input.selectionDirection,
            focused: document.activeElement === input,
          }
        : null;
      setVisible((current) => !current);
    }

    React.useLayoutEffect(() => {
      const selection = restoreSelectionRef.current;
      const input = inputRef.current;

      if (!selection || !input) return;

      if (selection.focused) {
        input.focus({ preventScroll: true });
      }

      try {
        input.setSelectionRange(selection.start, selection.end, selection.direction ?? undefined);
      } catch {
        // Some mobile browsers do not expose selection ranges for password inputs.
      }

      restoreSelectionRef.current = null;
    }, [visible]);

    const input = (
      <div className="relative">
        <Input
          ref={setInputRef}
          id={id}
          type={visible ? "text" : "password"}
          className={cn("pr-10", className)}
          value={value}
          disabled={disabled}
          aria-describedby={describedBy}
          {...props}
        />
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "absolute right-0 top-0 h-full min-h-11 w-10 rounded-r-md text-muted-foreground hover:text-foreground",
          )}
          disabled={disabled}
          onPointerDown={(event) => event.preventDefault()}
          onClick={toggleVisibility}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          aria-controls={id}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    );

    if (!showRequirements) {
      return input;
    }

    return (
      <div className="space-y-2">
        {input}
        <ul id={requirementsId} className="space-y-1 text-sm" aria-live="polite">
          {requirements.map((requirement) => (
            <li
              key={requirement.key}
              className={cn("flex items-center gap-2", requirement.met ? "text-success" : "text-muted-foreground")}
            >
              {requirement.met ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <span>{requirement.label}</span>
              <span className="sr-only">{requirement.met ? " (met)" : " (not met)"}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";

import { ClipboardEvent, KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

interface OTPInputProps {
  value: string;
  email?: string;
  destination?: string;
  loading?: boolean;
  error?: string | undefined;
  autoFocus?: boolean;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  onResend: () => Promise<void> | void;
}

export function OTPInput({
  autoFocus = true,
  destination,
  email,
  error,
  loading = false,
  onChange,
  onComplete,
  onResend,
  value,
}: OTPInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [secondsRemaining, setSecondsRemaining] = useState(RESEND_SECONDS);
  const errorId = useId();
  const digits = useMemo(() => value.padEnd(OTP_LENGTH, " ").slice(0, OTP_LENGTH).split(""), [value]);
  const canResend = secondsRemaining === 0 && !loading;
  const isComplete = value.length === OTP_LENGTH && !error;

  useEffect(() => {
    if (autoFocus) {
      inputsRef.current[0]?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (secondsRemaining === 0) return;

    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [secondsRemaining]);

  function updateValue(nextDigits: string[], focusIndex?: number) {
    const nextValue = nextDigits.join("").replace(/\D/g, "").slice(0, OTP_LENGTH);
    onChange(nextValue);

    if (nextValue.length === OTP_LENGTH) {
      onComplete?.(nextValue);
    }

    if (focusIndex !== undefined) {
      window.requestAnimationFrame(() => inputsRef.current[focusIndex]?.focus());
    }
  }

  function handleDigitChange(index: number, rawValue: string) {
    const nextCharacters = rawValue.replace(/\D/g, "");

    if (!nextCharacters) {
      const nextDigits = [...digits];
      nextDigits[index] = "";
      updateValue(nextDigits, index);
      return;
    }

    const nextDigits = [...digits];
    let nextIndex = index;

    for (const character of nextCharacters) {
      if (nextIndex >= OTP_LENGTH) break;
      nextDigits[nextIndex] = character;
      nextIndex += 1;
    }

    updateValue(nextDigits, Math.min(nextIndex, OTP_LENGTH - 1));
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index]?.trim() && index > 0) {
      event.preventDefault();
      const nextDigits = [...digits];
      nextDigits[index - 1] = "";
      updateValue(nextDigits, index - 1);
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputsRef.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    const pastedDigits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH - index);

    if (!pastedDigits) return;

    event.preventDefault();
    const nextDigits = [...digits];
    pastedDigits.split("").forEach((character, offset) => {
      nextDigits[index + offset] = character;
    });
    updateValue(nextDigits, Math.min(index + pastedDigits.length, OTP_LENGTH - 1));
  }

  async function handleResend() {
    if (!canResend) return;

    await onResend();
    onChange("");
    setSecondsRemaining(RESEND_SECONDS);
    window.requestAnimationFrame(() => inputsRef.current[0]?.focus());
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-3" disabled={loading}>
        <legend className="text-sm font-medium text-foreground">Enter the 6-digit code sent to {destination ?? email}</legend>
        <p className="text-sm text-muted-foreground">Paste the full code or type each digit. Verification starts automatically when all six digits are filled.</p>
        <div className="grid grid-cols-6 gap-2" role="group" aria-label="One-time verification code">
          {digits.map((digit, index) => (
            <Input
              key={index}
              ref={(input) => {
                inputsRef.current[index] = input;
              }}
              aria-label={`Digit ${index + 1}`}
              aria-describedby={error ? errorId : undefined}
              aria-invalid={error ? "true" : undefined}
              autoComplete={index === 0 ? "one-time-code" : "off"}
              className={cn(
                "aspect-square min-h-0 bg-card/80 p-0 text-center text-lg font-semibold transition-transform duration-base ease-standard sm:text-xl",
                digit.trim() ? "border-primary/60 shadow-xs" : "",
                loading ? "animate-pulse" : "",
                error ? "border-destructive focus-visible:ring-destructive" : "",
              )}
              inputMode="numeric"
              maxLength={1}
              pattern="[0-9]*"
              type="text"
              value={digit.trim()}
              onChange={(event) => handleDigitChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={(event) => handlePaste(index, event)}
            />
          ))}
        </div>
      </fieldset>
      {error ? (
        <p className="text-sm text-destructive" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
      {isComplete ? (
        <p className="flex items-center gap-2 text-sm text-success" role="status">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Code complete. Verifying now.
        </p>
      ) : null}
      <div className="flex flex-col gap-2 rounded-md border border-border bg-secondary/60 p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span aria-live="polite">
          {secondsRemaining > 0 ? `You can request another code in ${secondsRemaining}s.` : "You can request a new code now."}
        </span>
        <Button className="w-full sm:w-auto" disabled={!canResend} size="sm" type="button" variant="outline" onClick={() => void handleResend()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Resend code
        </Button>
      </div>
    </div>
  );
}

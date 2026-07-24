import { Link } from "react-router-dom";

import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string | undefined;
  iconClassName?: string | undefined;
  id?: string | undefined;
  labelClassName?: string | undefined;
  onClick?: () => void;
  showText?: boolean;
  to?: string;
}

export function BrandLogo({
  className,
  iconClassName,
  id,
  labelClassName,
  onClick,
  showText = true,
  to,
}: BrandLogoProps) {
  const content = (
    <>
      <BrandIcon className={iconClassName} />
      {showText ? <span className={cn("truncate font-semibold tracking-normal", labelClassName)}>{APP_NAME}</span> : null}
    </>
  );

  const classes = cn("inline-flex min-w-0 items-center gap-2 text-foreground", className);

  if (to) {
    return (
      <Link className={classes} id={id} to={to} aria-label={APP_NAME} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <div className={classes} id={id} aria-label={APP_NAME}>
      {content}
    </div>
  );
}

export function BrandIcon({ className }: { className?: string | undefined }) {
  return (
    <span
      className={cn(
        "relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md bg-primary text-primary-foreground shadow-soft",
        className,
      )}
      aria-hidden="true"
    >
      <span className="absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--secondary))_58%,hsl(var(--accent)))]" />
      <svg className="relative h-6 w-6" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path
          d="M12.7 19.3 19.3 12.7"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M10.2 14.6 8.6 16.2a5 5 0 0 0 7.1 7.1l2-2"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="m21.8 17.4 1.6-1.6a5 5 0 0 0-7.1-7.1l-2 2"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

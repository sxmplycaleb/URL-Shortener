import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-wait",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        outline: "border border-input bg-background hover:bg-muted hover:text-foreground",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        destructive: "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
      },
      size: {
        default: "px-4 py-2",
        sm: "min-h-10 px-3",
        lg: "min-h-12 px-6",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

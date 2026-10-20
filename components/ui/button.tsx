import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "../../lib/utils";

// pointer-coarse: touch screens get a 44px minimum target whatever the visual
// size or a caller's h-7/w-7 override (QA-RESP-07); mouse layouts are unchanged.
const buttonVariants = cva(
  "pointer-coarse:min-h-11 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-100 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-wait [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:focus-ring aria-invalid:border-destructive [&>[data-spinner]+svg]:hidden",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover font-semibold shadow-xs",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-border-strong bg-card hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-brand-text underline-offset-4 hover:underline pointer-coarse:min-h-0",
        soft: "bg-brand-soft text-brand-soft-foreground hover:bg-primary/15",
        "outline-inverse":
          "border border-sidebar-border text-sidebar-accent-foreground hover:bg-sidebar-accent",
      },
      size: {
        xs: "h-7 gap-1.5 px-2.5 text-xs has-[>svg]:px-2",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        lg: "h-11 px-5 text-base has-[>svg]:px-4",
        icon: "size-9 pointer-coarse:min-w-11",
        "icon-xs": "size-7 pointer-coarse:min-w-11",
        "icon-sm": "size-8 pointer-coarse:min-w-11",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Shows a spinner in place of the leading icon and disables the button. */
    loading?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading || undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {/* Slot needs a single child, so the spinner is only rendered for real buttons. */}
      {loading && !asChild ? (
        <>
          <Loader2 data-spinner="" className="animate-spin" aria-hidden="true" />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export { Button, buttonVariants };

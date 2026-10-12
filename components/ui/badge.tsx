import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";
import { toneDot, toneSoft, toneSolid } from "../../lib/design/tones";

const badgeVariants = cva(
  "inline-flex h-5 items-center justify-center gap-1 rounded-full px-2 text-2xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 [&>svg]:pointer-events-none focus-visible:focus-ring aria-invalid:border-destructive transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default: toneSoft.brand,
        secondary: toneSoft.neutral,
        destructive: toneSoft.danger,
        success: toneSoft.success,
        warning: toneSoft.warning,
        info: toneSoft.info,
        teal: toneSoft.teal,
        plum: toneSoft.plum,
        outline: "border border-border-strong text-muted-foreground",
        solid: toneSolid.brand,
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const dotClass: Record<BadgeVariant, string> = {
  default: toneDot.brand,
  secondary: toneDot.neutral,
  destructive: toneDot.danger,
  success: toneDot.success,
  warning: toneDot.warning,
  info: toneDot.info,
  teal: toneDot.teal,
  plum: toneDot.plum,
  outline: toneDot.neutral,
  solid: "bg-current",
};

function Badge({
  className,
  variant,
  asChild = false,
  dot = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
    /** Leading 6px status dot (ignored with asChild). */
    dot?: boolean;
  }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {dot && !asChild ? (
        <>
          <span
            aria-hidden="true"
            className={cn("size-1.5 shrink-0 rounded-full", dotClass[variant ?? "default"])}
          />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export { Badge, badgeVariants };
export type { BadgeVariant };

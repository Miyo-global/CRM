"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PasswordInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type"
> & {
  showToggle?: boolean;
};

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    { className, showToggle = true, disabled, ...props },
    ref,
  ) {
    const [show, setShow] = React.useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={show ? "text" : "password"}
          disabled={disabled}
          className={cn(
            showToggle && "pr-9",
            "hide-native-password-reveal",
            className,
          )}
          {...props}
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            tabIndex={-1}
            disabled={disabled}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 disabled:pointer-events-none disabled:opacity-50"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    );
  },
);

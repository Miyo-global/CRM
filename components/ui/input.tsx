import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * Icons: wrap in `relative` and place the svg `absolute left-3 top-1/2 -translate-y-1/2`,
 * then give the input `pl-9` (or the wrapper `has-[svg]:[&_input]:pl-9`); trailing icon → `pr-9`.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-card px-3 py-1 text-sm text-foreground placeholder:text-subtle-foreground shadow-xs transition-[color,border-color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "file:mr-3 file:inline-flex file:h-7 file:items-center file:rounded-sm file:border-0 file:bg-muted file:px-2 file:text-xs file:font-medium file:text-foreground",
        "focus-visible:focus-ring focus-visible:border-ring",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
}

export { Input };

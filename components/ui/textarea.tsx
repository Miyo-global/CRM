import * as React from "react";

import { cn } from "../../lib/utils";

// max-h: a 5000-character paste used to grow the box until the Send button
// left the screen (R3-HR-08). Pass a max-h-* class to change the cap.
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 max-h-80 overflow-y-auto w-full rounded-md border border-input bg-card px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-subtle-foreground shadow-xs transition-[color,border-color,box-shadow] outline-none focus-visible:focus-ring focus-visible:border-ring aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };

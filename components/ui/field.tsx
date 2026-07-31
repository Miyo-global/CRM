"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { Label } from "./label";

interface FieldProps {
  label: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  hint?: React.ReactNode;
  error?: string | null;
  count?: number;
  max?: number;
  className?: string;
  labelClassName?: string;
  children: React.ReactElement<{
    id?: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }>;
}

export function Field({
  label,
  required = false,
  optional = false,
  hint,
  error,
  count,
  max,
  className,
  labelClassName,
  children,
}: FieldProps) {
  const reactId = React.useId();
  const id = children.props.id ?? `field-${reactId}`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;
  const showCount = typeof count === "number" && typeof max === "number";

  const control = React.cloneElement(children, {
    id,
    "aria-invalid": error ? true : children.props["aria-invalid"],
    "aria-describedby": describedBy ?? children.props["aria-describedby"],
  });

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className={labelClassName}>
          {label}
          {required && (
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          )}
          {optional && (
            <span className="text-2xs font-normal text-muted-foreground">
              (optional)
            </span>
          )}
        </Label>
        {showCount && (
          <span
            className={cn(
              "text-2xs tabular-nums",
              count! > max! ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {count}/{max}
          </span>
        )}
      </div>

      {control}

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

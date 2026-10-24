"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { parseAmountInput } from "@/lib/numeric-input";

type MoneyInputProps = Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: number | null | undefined;
  /** Blank -> undefined, "12abc" / "-" -> NaN, so the form schema can say what is wrong. */
  onChange: (value: number | undefined) => void;
};

/**
 * Amount field for react-hook-form (R3-EMP-03). Shows exactly what was typed
 * ("-5000" stays "-5000") and hands the parsed number to the form; the schema
 * (amountSchema in lib/numeric-input) gives the message.
 */
export function MoneyInput({ value, onChange, ...props }: MoneyInputProps) {
  const [text, setText] = React.useState(() => (value ? String(value) : ""));

  // Follow outside changes (form reset, edit dialog opening) without
  // rewriting what the user is typing.
  React.useEffect(() => {
    const parsed = parseAmountInput(text);
    if (Object.is(parsed, value) || (parsed === undefined && !value)) return;
    setText(value == null || Number.isNaN(value) ? "" : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      {...props}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseAmountInput(e.target.value));
      }}
    />
  );
}

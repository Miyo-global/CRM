"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Check } from "lucide-react";

interface PasswordConfirmFieldProps {
  value: string;
  onChange: (value: string) => void;
  password: string;
  disabled?: boolean;
  showIcon?: boolean;
  label?: string;
}

export function PasswordConfirmField({
  value,
  onChange,
  password,
  disabled = false,
  showIcon = false,
  label = "Confirm Password",
}: PasswordConfirmFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const passwordsMatch = value.length > 0 && password === value;
  const passwordsMismatch = value.length > 0 && password !== value;

  return (
    <div className="space-y-2">
      <Label htmlFor="confirmPassword" className="text-foreground">{label}</Label>
      <div className="relative">
        {showIcon && (
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          id="confirmPassword"
          type={showPassword ? "text" : "password"}
          placeholder="Confirm your password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          disabled={disabled}
          className={`hide-native-password-reveal ${showIcon ? "pl-10" : ""} pr-10 focus-visible:ring-primary ${
            passwordsMatch ? "border-green-500 focus-visible:ring-green-500" :
            passwordsMismatch ? "border-red-500 focus-visible:ring-red-500" : ""
          }`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={showPassword ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {passwordsMismatch && <p className="text-xs text-destructive">Passwords do not match</p>}
      {passwordsMatch && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <Check className="h-3 w-3" /> Passwords match
        </p>
      )}
    </div>
  );
}

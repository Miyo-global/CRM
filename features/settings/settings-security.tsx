"use client";

import { useState, useCallback, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Monitor, Smartphone, Trash2, Check, Circle } from "lucide-react";
import { useChangePassword } from "@/lib/api/hooks/hr";
import { useSessions, useRevokeSession, useRevokeAllSessions, useRevokeSessions } from "@/lib/api/hooks/hr";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusPill } from "@/components/ui/status-pill";
import { Checkbox } from "@/components/ui/checkbox";
import { PASSWORD_RULES, passwordChecks } from "@/lib/utils/password-validation";

function getStrength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (passwordChecks(pw).special) s++;
  const level = s <= 2 ? 1 : s <= 4 ? 2 : s <= 5 ? 3 : 4;
  const colors = ["bg-danger-500", "bg-warning-400", "bg-success-400", "bg-success-500"];
  const labels = ["Weak", "Fair", "Good", "Strong"];
  return { level, color: colors[level - 1], label: labels[level - 1] };
}

const RULES: { label: string; test: (pw: string) => boolean }[] = [
  { label: `${PASSWORD_RULES.minLength}–${PASSWORD_RULES.maxLength} characters`, test: (pw) => passwordChecks(pw).length },
  { label: "One uppercase letter", test: (pw) => passwordChecks(pw).uppercase },
  { label: "One lowercase letter", test: (pw) => passwordChecks(pw).lowercase },
  { label: "One number", test: (pw) => passwordChecks(pw).number },
  { label: "One symbol or space", test: (pw) => passwordChecks(pw).special },
];

function isPasswordValid(pw: string) {
  return RULES.every((r) => r.test(pw));
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  autoComplete?: string;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value), [onChange]);
  const handleToggleShow = useCallback(() => setShow((v) => !v), []);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete={autoComplete}
          className={cn("pr-9", error && "border-destructive")}
        />
        <button
          type="button"
          onClick={handleToggleShow}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground transition-colors focus-visible:focus-ring"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function getDeviceIcon(userAgent: string | null) {
  if (!userAgent) return <Monitor className="h-4 w-4" />;
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    return <Smartphone className="h-4 w-4" />;
  }
  return <Monitor className="h-4 w-4" />;
}

function parseDeviceName(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const ua = userAgent.toLowerCase();
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("edg")) return "Microsoft Edge";
  if (ua.includes("chrome")) return "Chrome";
  if (ua.includes("safari")) return "Safari";
  if (ua.includes("opera")) return "Opera";
  return "Browser";
}

function SessionsSection() {
  const { data: sessions, isLoading } = useSessions();
  const revokeOne = useRevokeSession();
  const revokeMany = useRevokeSessions();
  const revokeAll = useRevokeAllSessions();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);
  const [revokeSelectedOpen, setRevokeSelectedOpen] = useState(false);

  const otherSessions = useMemo(
    () => sessions?.filter((s) => !s.isCurrent) ?? [],
    [sessions],
  );

  const selectedCount = selectedIds.size;
  const allOthersSelected =
    otherSessions.length > 0 && otherSessions.every((s) => selectedIds.has(s.id));
  const someOthersSelected = otherSessions.some((s) => selectedIds.has(s.id));

  const toggleSession = useCallback((sessionId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(sessionId);
      else next.delete(sessionId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(otherSessions.map((s) => s.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [otherSessions],
  );

  const handleRevokeOne = useCallback((sessionId: string) => {
    revokeOne.mutate(sessionId, {
      onSuccess: () => {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(sessionId);
          return next;
        });
        toast.success("Session revoked");
      },
      onError: () => toast.error("Failed to revoke session"),
    });
  }, [revokeOne]);

  const handleRevokeSelected = useCallback(() => {
    const ids = [...selectedIds];
    revokeMany.mutate(ids, {
      onSuccess: (data) => {
        const count = data.revokedCount ?? ids.length;
        toast.success(`Signed out ${count} session${count !== 1 ? "s" : ""}`);
        setSelectedIds(new Set());
        setRevokeSelectedOpen(false);
      },
      onError: () => toast.error("Failed to revoke selected sessions"),
    });
  }, [revokeMany, selectedIds]);

  const handleRevokeAll = useCallback(() => {
    revokeAll.mutate(undefined, {
      onSuccess: (data) => {
        const count = (data as { revokedCount?: number }).revokedCount ?? 0;
        toast.success(`Signed out ${count} other session${count !== 1 ? "s" : ""}`);
        setSelectedIds(new Set());
        setRevokeAllOpen(false);
      },
      onError: () => toast.error("Failed to revoke sessions"),
    });
  }, [revokeAll]);

  const handleOpenRevokeAll = useCallback(() => setRevokeAllOpen(true), []);
  const handleOpenRevokeSelected = useCallback(() => setRevokeSelectedOpen(true), []);
  const revokePending = revokeOne.isPending || revokeMany.isPending || revokeAll.isPending;

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Active sessions</p>
            <p className="text-xs text-muted-foreground">Manage where you are signed in.</p>
          </div>
        </div>
        {otherSessions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {selectedCount > 0 && (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={revokePending}
                  loading={revokeMany.isPending}
                  onClick={handleOpenRevokeSelected}
                >
                  {`Sign out selected (${selectedCount})`}
                </Button>
                <ConfirmDialog
                  open={revokeSelectedOpen}
                  onOpenChange={setRevokeSelectedOpen}
                  title="Sign out selected sessions?"
                  description={`This will immediately revoke ${selectedCount} selected session${selectedCount !== 1 ? "s" : ""}. Those devices will need to sign in again.`}
                  confirmLabel="Sign out selected"
                  onConfirm={handleRevokeSelected}
                />
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={revokePending}
              loading={revokeAll.isPending}
              onClick={handleOpenRevokeAll}
            >
              Sign out all others
            </Button>
            <ConfirmDialog
              open={revokeAllOpen}
              onOpenChange={setRevokeAllOpen}
              title="Sign out other sessions?"
              description={`This will immediately revoke ${otherSessions.length} other session${otherSessions.length !== 1 ? "s" : ""}. Those devices will need to sign in again.`}
              confirmLabel="Sign out"
              onConfirm={handleRevokeAll}
            />
          </div>
        )}
      </div>

      <div className="h-px bg-border" />

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 rounded-md bg-muted animate-pulse motion-reduce:animate-none" />
          ))}
        </div>
      ) : !sessions?.length ? (
        <p className="text-xs text-muted-foreground text-center py-4">No active sessions found.</p>
      ) : (
        <div className="space-y-2">
          {otherSessions.length > 0 && (
            <label className="flex items-center gap-2.5 px-1 py-1 cursor-pointer select-none">
              <Checkbox
                checked={allOthersSelected ? true : someOthersSelected ? "indeterminate" : false}
                onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                aria-label="Select all other sessions"
              />
              <span className="text-xs text-muted-foreground">
                Select all other sessions ({otherSessions.length})
              </span>
            </label>
          )}
          {sessions.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              selected={selectedIds.has(s.id)}
              onSelectChange={toggleSession}
              onRevoke={handleRevokeOne}
              revokePending={revokePending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SettingsSecurity() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const changePassword = useChangePassword();
  const strength = next ? getStrength(next) : null;
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit =
    current.length > 0 &&
    isPasswordValid(next) &&
    next === confirm &&
    !changePassword.isPending;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    changePassword.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          toast.success("Password changed successfully");
          setCurrent(""); setNext(""); setConfirm("");
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to change password");
        },
      }
    );
  }, [canSubmit, current, next, changePassword]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5 space-y-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Change password</p>
            <p className="text-xs text-muted-foreground">Use a unique, strong password.</p>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="space-y-4 sm:max-w-md">
          <PasswordInput
            id="current-pw"
            label="Current password"
            value={current}
            onChange={setCurrent}
            placeholder="Your current password"
            autoComplete="current-password"
          />

          <PasswordInput
            id="new-pw"
            label="New password"
            value={next}
            onChange={setNext}
            placeholder={`${PASSWORD_RULES.minLength}–${PASSWORD_RULES.maxLength} characters`}
            maxLength={PASSWORD_RULES.maxLength}
            autoComplete="new-password"
          />

          {next.length > 0 && strength && (
            <div className="space-y-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((l) => (
                  <div
                    key={l}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      l <= strength.level ? strength.color : "bg-muted"
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  {RULES.map((r) => (
                    <p
                      key={r.label}
                      className={cn(
                        "text-xs leading-snug",
                        r.test(next) ? "text-success-strong" : "text-muted-foreground"
                      )}
                    >
                      {r.test(next) ? (
                        <Check className="mr-1 inline size-3" aria-hidden="true" />
                      ) : (
                        <Circle className="mr-1 inline size-3" aria-hidden="true" />
                      )}
                      {r.label}
                    </p>
                  ))}
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold self-start",
                    strength.level === 1 && "text-danger-strong",
                    strength.level === 2 && "text-warning-strong",
                    strength.level >= 3 && "text-success-strong"
                  )}
                >
                  {strength.label}
                </span>
              </div>
            </div>
          )}

          <PasswordInput
            id="confirm-pw"
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            placeholder="Re-enter new password"
            autoComplete="new-password"
            error={mismatch ? "Passwords do not match" : undefined}
          />
        </div>

        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit}
            loading={changePassword.isPending}
          >
            {changePassword.isPending ? "Changing…" : "Update password"}
          </Button>
        </div>
      </div>

      <SessionsSection />
    </div>
  );
}

type SessionData = {
  id: string;
  isCurrent: boolean;
  userAgent: string | null;
  ipAddress: string | null;
  lastActive: string | Date;
};

interface SessionRowProps {
  session: SessionData;
  selected: boolean;
  onSelectChange: (sessionId: string, checked: boolean) => void;
  onRevoke: (id: string) => void;
  revokePending: boolean;
}

function SessionRow({
  session: s,
  selected,
  onSelectChange,
  onRevoke,
  revokePending,
}: SessionRowProps) {
  const handleRevoke = useCallback(() => onRevoke(s.id), [s.id, onRevoke]);
  const handleCheckedChange = useCallback(
    (checked: boolean | "indeterminate") => onSelectChange(s.id, checked === true),
    [s.id, onSelectChange],
  );

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-md border border-border bg-card transition-colors",
        selected && "border-primary bg-brand-soft",
      )}
    >
      {!s.isCurrent ? (
        <Checkbox
          checked={selected}
          onCheckedChange={handleCheckedChange}
          disabled={revokePending}
          aria-label={`Select ${parseDeviceName(s.userAgent)} session`}
        />
      ) : (
        <span className="size-4 shrink-0" aria-hidden />
      )}
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">{getDeviceIcon(s.userAgent)}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{parseDeviceName(s.userAgent)}</p>
          {s.isCurrent && (
            <StatusPill tone="success" dot>
              Current
            </StatusPill>
          )}
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {s.ipAddress ? `${s.ipAddress} · ` : ""}
          Active {formatDistanceToNow(new Date(s.lastActive), { addSuffix: true })}
        </p>
      </div>
      {!s.isCurrent && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          onClick={handleRevoke}
          disabled={revokePending}
          aria-label="Revoke session"
        >
          <Trash2 aria-hidden />
        </Button>
      )}
    </div>
  );
}

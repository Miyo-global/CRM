"use client";

import { useState, useCallback, useEffect, memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUpdateOrgSettings } from "@/lib/api/hooks/organization";
import { toast } from "sonner";
import type { OrgSettings } from "@/types/organization";


function isValidIpEntry(value: string): boolean {
  const ipv4Octet = "(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])";
  const ipv4 = new RegExp(`^${ipv4Octet}(\\.${ipv4Octet}){3}$`);
  const ipv4Prefix = new RegExp(`^${ipv4Octet}(\\.${ipv4Octet}){0,3}\\.$`);
  const ipv6 = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return ipv4.test(value) || ipv4Prefix.test(value) || ipv6.test(value);
}

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function NetworkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="2" width="6" height="6" rx="1" />
      <rect x="3" y="16" width="6" height="6" rx="1" />
      <rect x="15" y="16" width="6" height="6" rx="1" />
      <path d="M12 8v4" />
      <path d="M6 16v-2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

interface IpBadgeItemProps {
  ip: string;
  onRemove: (ip: string) => void;
}

const IpBadgeItem = memo(function IpBadgeItem({ ip, onRemove }: IpBadgeItemProps) {
  const handleRemove = useCallback(() => onRemove(ip), [onRemove, ip]);
  return (
    <Badge variant="secondary" className="gap-1 pr-1 font-mono text-xs">
      {ip}
      <button
        type="button"
        onClick={handleRemove}
        className="ml-0.5 rounded-full hover:bg-muted p-0.5"
        aria-label={`Remove ${ip}`}
      >
        <XIcon className="h-3 w-3" />
      </button>
    </Badge>
  );
});


interface IpAllowlistCardProps {
  org: OrgSettings;
}

export function IpAllowlistCard({ org }: IpAllowlistCardProps) {
  const [ipAllowlist, setIpAllowlist] = useState<string[]>(org.ipAllowlist ?? []);
  const [ipInput, setIpInput] = useState("");

  const { mutate: updateOrg, isPending: isUpdating } = useUpdateOrgSettings();

  useEffect(() => {
    setIpAllowlist(org.ipAllowlist ?? []);
  }, [org.id, org.ipAllowlist]);

  const handleIpInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setIpInput(e.target.value),
    []
  );

  const handleAddIp = useCallback(() => {
    const ip = ipInput.trim();
    if (!ip) return;
    if (ipAllowlist.includes(ip)) {
      toast.error("That IP or prefix is already in the list");
      return;
    }
    if (!isValidIpEntry(ip)) {
      toast.error("Enter a valid IPv4/IPv6 address or IPv4 prefix (e.g. 203.0.113.5 or 192.168.1.)");
      return;
    }
    setIpAllowlist((prev) => [...prev, ip]);
    setIpInput("");
  }, [ipInput, ipAllowlist]);

  const handleRemoveIp = useCallback((ip: string) => {
    setIpAllowlist((prev) => prev.filter((i) => i !== ip));
  }, []);

  const handleIpKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddIp();
      }
    },
    [handleAddIp]
  );

  const handleSave = useCallback(() => {
    updateOrg(
      { ipAllowlist },
      {
        onSuccess: () => toast.success("IP allowlist saved"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
      }
    );
  }, [ipAllowlist, updateOrg]);

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <NetworkIcon className="h-4 w-4 text-gold" />
          IP Allowlist
        </CardTitle>
        <CardDescription>
          Restrict dashboard access to specific IP addresses or prefixes. Leave empty to allow access from any IP.
          Add exact IPs (e.g. <code>203.0.113.5</code>) or prefixes (e.g. <code>192.168.1.</code>).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 min-h-8">
          {ipAllowlist.map((ip) => (
            <IpBadgeItem key={ip} ip={ip} onRemove={handleRemoveIp} />
          ))}
          {ipAllowlist.length === 0 && (
            <span className="text-xs text-muted-foreground">No IP restrictions — all IPs allowed.</span>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. 203.0.113.5 or 192.168.1."
            value={ipInput}
            onChange={handleIpInputChange}
            onKeyDown={handleIpKeyDown}
            className="w-full max-w-sm font-mono text-sm"
            aria-label="IP address or prefix to add"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleAddIp}>
            <PlusIcon className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>
        <div className="pt-1">
          <Button onClick={handleSave} disabled={isUpdating} size="sm">
            {isUpdating ? (
              <>
                <LoaderIcon className="h-3.5 w-3.5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save IP Allowlist"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

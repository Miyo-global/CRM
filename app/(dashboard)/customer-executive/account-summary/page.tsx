"use client";

import { useState, useCallback } from "react";
import { FileText, Sparkles, Download, Copy, CheckCheck, RefreshCw, Loader2, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useAccountSummary, type AccountSummaryResult } from "@/lib/api/hooks/ai";
import { useSimpleClientsList } from "@/lib/api/hooks/crm";
import { toast } from "sonner";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";



function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, [text]);

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} aria-label="Copy summary to clipboard">
      {copied ? (
        <CheckCheck className="h-4 w-4 mr-2 text-green-500" />
      ) : (
        <Copy className="h-4 w-4 mr-2" />
      )}
      {copied ? "Copied!" : "Copy"}
    </Button>
  );
}



function DownloadButton({ text, clientName }: { text: string; clientName: string }) {
  const handleDownload = useCallback(() => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `account-summary-${clientName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [text, clientName]);

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} aria-label="Download summary as text file">
      <Download className="h-4 w-4 mr-2" />
      Download .txt
    </Button>
  );
}



interface ResultCardProps {
  result: AccountSummaryResult;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

function ResultCard({ result, onRegenerate, isRegenerating }: ResultCardProps) {
  const paragraphs = result.summary.split(/\n{2,}/).filter(Boolean);
  const generatedAt = new Date(result.generatedAt).toLocaleString(DEFAULT_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-lg">{result.clientName}</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Generated at {generatedAt}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <CopyButton text={result.summary} />
            <DownloadButton text={result.summary} clientName={result.clientName} />
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={isRegenerating}
              aria-label="Regenerate summary"
            >
              {isRegenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Regenerate
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none space-y-3">
          {paragraphs.map((para, i) => {
            const lines = para.split("\n");
            return (
              <div key={i} className="space-y-1">
                {lines.map((line, j) => {
                  const isHeader =
                    /^\d+\.\s/.test(line) ||
                    (line.endsWith(":") && line.length < 60) ||
                    /^[A-Z][A-Z\s&]+:/.test(line);
                  if (isHeader) {
                    return (
                      <p key={j} className="font-semibold text-sm text-foreground">
                        {line}
                      </p>
                    );
                  }
                  return (
                    <p key={j} className="text-sm text-muted-foreground leading-relaxed">
                      {line}
                    </p>
                  );
                })}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}



export default function AccountSummaryPage() {
  const { data: clients = [], isLoading: isLoadingClients } = useSimpleClientsList();
  const { mutateAsync: generateSummary, isPending } = useAccountSummary();

  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [result, setResult] = useState<AccountSummaryResult | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!selectedClientId) return;
    try {
      const data = await generateSummary(Number(selectedClientId));
      setResult(data);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to generate summary";
      if (msg.toLowerCase().includes("not configured")) {
        toast.error("AI features require OPENAI_API_KEY to be configured");
      } else if (msg.toLowerCase().includes("not found")) {
        toast.error("Client not found. Please select a valid client.");
      } else {
        toast.error(msg);
      }
    }
  }, [selectedClientId, generateSummary]);

  const handleRegenerate = useCallback(async () => {
    await handleGenerate();
  }, [handleGenerate]);

  return (
    <PageWrapper
      title="Account Summary Generator"
      subtitle="Generate executive briefing summaries for client accounts"
      badge={
        <span className="flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          AI
        </span>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Select Client
              </CardTitle>
              <CardDescription>
                Choose a client account to generate a comprehensive executive briefing summary.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="client-select">Client Account</Label>
                {isLoadingClients ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger id="client-select" aria-label="Select a client">
                      <SelectValue placeholder="Select a client…" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.length === 0 ? (
                        <SelectItem value="__none__" disabled>
                          No clients found
                        </SelectItem>
                      ) : (
                        clients.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={!selectedClientId || isPending || isLoadingClients}
                aria-label="Generate account summary"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Summary
                  </>
                )}
              </Button>

              {result && !isPending && (
                <p className="text-xs text-muted-foreground text-center">
                  Summary generated successfully. Select another client to generate a new one.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-foreground mb-2">What&apos;s included</p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {[
                  "Executive overview & account health",
                  "Investment profile & plan details",
                  "Renewal status & recommended actions",
                  "Recent engagement summary",
                  "Key risks & upsell opportunities",
                  "Next steps for account manager",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {isPending && (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32 mt-1" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {!isPending && result && (
            <ResultCard
              result={result}
              onRegenerate={handleRegenerate}
              isRegenerating={isPending}
            />
          )}

          {!isPending && !result && (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border h-64 text-center p-8">
              <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No summary generated yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Select a client from the panel on the left and click &quot;Generate Summary&quot;
              </p>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

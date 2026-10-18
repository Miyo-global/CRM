"use client";

import { FileText } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { useKbSettings } from "@/lib/api/hooks/knowledge";
import { KB_COMPANY_DOCUMENTS } from "@/lib/knowledge/routes";

/**
 * KB-0070: the HR documents surfaced in the wiki.
 *
 * Hidden unless the org has turned the link on: an org that has not asked for
 * HR documents in the wiki should not see an empty section about them. The
 * documents themselves arrive with the linked-documents work (KB-0137).
 */
export function WikiCompanyDocumentsStrip() {
  const { data } = useKbSettings();

  if (!data?.hrmsKbLinkEnabled) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-foreground">Company documents</h2>
      <Card>
        <CardContent className="flex items-center gap-2 p-4 text-sm">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Link href={KB_COMPANY_DOCUMENTS} className="underline underline-offset-4">
            Policies and handbooks from HR
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}

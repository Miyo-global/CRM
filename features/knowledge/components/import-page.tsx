"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  useKbImport,
  useKbImportDryRun,
  type KbImportItem,
  type KbImportPlan,
} from "@/lib/api/hooks/knowledge";

import {
  IMPORT_MAX_FILES,
  readImportFiles,
  sourceTypeForFiles,
  type ImportSourceType,
} from "../lib/read-import-files";
import { ExportJobsCard } from "./export-jobs-card";
import { ImportDryRunCard } from "./import-dry-run-card";
import { ImportFormControls } from "./import-form-controls";
import { ImportHistorySection } from "./import-history-section";
import { ImportPendingList } from "./import-pending-list";

/**
 * KB-0088: import and export.
 *
 * Files are read in the browser, including unpacking a zip, so the import
 * endpoint only ever sees a list of titles and bodies and a zip full of images
 * never travels. The dry run comes first: "replace its content" aimed at the
 * wrong space is not something to discover afterwards.
 */
export function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<KbImportItem[]>([]);
  const [skipped, setSkipped] = useState<Array<{ name: string; reason: string }>>([]);
  const [sourceType, setSourceType] = useState<ImportSourceType>("markdown");
  const [spaceId, setSpaceId] = useState("");
  const [visibility, setVisibility] = useState("org");
  const [duplicatePolicy, setDuplicatePolicy] = useState("skip");
  const [plan, setPlan] = useState<KbImportPlan | null>(null);

  const dryRun = useKbImportDryRun();
  const runImport = useKbImport();

  const request = {
    sourceType,
    items,
    spaceId: spaceId ? Number(spaceId) : undefined,
    visibility: visibility as "private" | "org",
    duplicatePolicy: duplicatePolicy as "skip" | "update",
  };

  async function pick(files: FileList | null) {
    if (!files || files.length === 0) return;
    const chosen = [...files];
    const result = await readImportFiles(chosen);

    setItems(result.items);
    setSkipped(result.skipped);
    setSourceType(sourceTypeForFiles(chosen.map((file) => file.name)));
    setPlan(null);

    if (result.truncated) {
      toast.warning(`Only the first ${IMPORT_MAX_FILES} pages will be imported.`);
    }
  }

  return (
    <PageWrapper title="Import & export" subtitle="Bring pages in, or take them out" breadcrumbs={false}>
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-foreground">Import</h2>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".md,.markdown,.html,.htm,.txt,.zip"
            className="hidden"
            onChange={(event) => void pick(event.target.files)}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
              Choose files
            </Button>
            <span className="text-sm text-muted-foreground">
              Markdown, HTML or a .zip of either. Up to {IMPORT_MAX_FILES} pages.
            </span>
          </div>

          <ImportPendingList
            items={items}
            skipped={skipped}
            onRemove={(index) => {
              setItems((current) => current.filter((_, i) => i !== index));
              setPlan(null);
            }}
          />

          {items.length > 0 ? (
            <>
              <ImportFormControls
                spaceId={spaceId}
                visibility={visibility}
                duplicatePolicy={duplicatePolicy}
                onSpaceChange={(value) => {
                  setSpaceId(value);
                  setPlan(null);
                }}
                onVisibilityChange={setVisibility}
                onDuplicatePolicyChange={(value) => {
                  setDuplicatePolicy(value);
                  setPlan(null);
                }}
              />

              {plan ? <ImportDryRunCard plan={plan} /> : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={dryRun.isPending}
                  onClick={() =>
                    dryRun.mutate(request, {
                      onSuccess: setPlan,
                      onError: () => toast.error("Couldn't check those files."),
                    })
                  }
                >
                  Check first
                </Button>

                <Button
                  size="sm"
                  disabled={runImport.isPending}
                  onClick={() =>
                    runImport.mutate(request, {
                      onSuccess: (result) => {
                        toast.success(
                          result.status === "completed"
                            ? `Imported ${result.created ?? 0} pages`
                            : "Import queued",
                        );
                        setItems([]);
                        setSkipped([]);
                        setPlan(null);
                      },
                      onError: () => toast.error("Couldn't import those files."),
                    })
                  }
                >
                  Import {items.length}
                </Button>
              </div>
            </>
          ) : null}
        </section>

        <ImportHistorySection />

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-foreground">Export</h2>
          <ExportJobsCard />
        </section>
      </div>
    </PageWrapper>
  );
}

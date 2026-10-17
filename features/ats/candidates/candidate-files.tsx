"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface CandidateFile {
  id: number;
  fileName: string | null;
  fileSize: number | null;
  url: string | null;
}

/** MIYO-0647: portfolios and certificates, behind short-lived links. */
export function CandidateFiles({ candidateId }: { candidateId: number }) {
  const [files, setFiles] = useState<CandidateFile[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/ats/candidates/${candidateId}/files`);
    if (res.ok) setFiles(await res.json());
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  async function upload(file: File) {
    setBusy(true);
    try {
      const data = new FormData();
      data.set("file", file);
      const res = await fetch(`/api/ats/candidates/${candidateId}/files`, {
        method: "POST",
        body: data,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body?.error ?? "Could not upload that file.");
        return;
      }
      toast.success("Uploaded.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 py-2">
      <ul className="grid gap-2 text-sm">
        {files.map((file) => (
          <li key={file.id}>
            {file.url ? (
              <a href={file.url} className="text-foreground underline underline-offset-4">
                {file.fileName}
              </a>
            ) : (
              <span className="text-muted-foreground">{file.fileName}</span>
            )}
            {file.fileSize !== null && (
              <span className="ml-2 text-xs text-muted-foreground">
                {Math.round(file.fileSize / 1024)} KB
              </span>
            )}
          </li>
        ))}
        {files.length === 0 && <li className="text-muted-foreground">No files yet.</li>}
      </ul>

      <div>
        <input
          id="candidate-file"
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
        <Button variant="outline" size="sm" disabled={busy} asChild>
          <label htmlFor="candidate-file">Upload a file</label>
        </Button>
      </div>
    </div>
  );
}

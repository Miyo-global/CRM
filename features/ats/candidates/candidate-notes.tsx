"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";

/** MIYO-0646: write a note, and tell the people named in it. */
export function CandidateNoteComposer({
  candidateId,
  people,
}: {
  candidateId: number;
  people: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/ats/candidates/${candidateId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, mentions }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload?.error ?? "Could not save the note.");
        return;
      }
      setBody("");
      setMentions([]);
      toast.success(mentions.length > 0 ? "Note saved, people notified." : "Note saved.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid max-w-xl gap-3 py-2">
      <Textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What you want the next person reading this to know."
        aria-label="New note"
      />
      <SearchableMultiSelect
        options={people.map((p) => ({ value: p.id, label: p.name }))}
        values={mentions}
        onValuesChange={setMentions}
        placeholder="Tell someone about it"
      />
      <div>
        <Button size="sm" disabled={busy || !body.trim()} onClick={() => void save()}>
          Add note
        </Button>
      </div>
    </div>
  );
}

/** MIYO-0646: tags, added by typing one. */
export function CandidateTags({
  candidateId,
  tags,
}: {
  candidateId: number;
  tags: string[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function change(tagName: string, remove: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/ats/candidates/${candidateId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tagName, remove }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.error ?? "Could not change the tags.");
        return;
      }
      setName("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          disabled={busy}
          onClick={() => void change(tag, true)}
          className="rounded-full border border-border px-3 py-1 text-xs text-foreground"
          aria-label={`Remove the tag ${tag}`}
        >
          {tag} ×
        </button>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) void change(name.trim(), false);
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a tag"
          aria-label="Add a tag"
          className="rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground"
        />
      </form>
    </div>
  );
}

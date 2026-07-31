"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Eye,
  EyeOff,
  ExternalLink,
  Globe,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";


export interface PageBuilderToolbarProps {
  isEditing: boolean;
  publicUrl: string | null;
  showPreview: boolean;
  onTogglePreview: () => void;
  isPending: boolean;
  isPublished: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
}

export function PageBuilderToolbar({
  isEditing,
  publicUrl,
  showPreview,
  onTogglePreview,
  isPending,
  isPublished,
  onSaveDraft,
  onPublish,
}: PageBuilderToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href="/marketing/landing-pages">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Link>
      </Button>

      {isEditing && publicUrl && (
        <Button variant="ghost" size="sm" asChild>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1.5 h-4 w-4" />
            View Live
          </a>
        </Button>
      )}

      <Button variant="outline" size="sm" onClick={onTogglePreview}>
        {showPreview
          ? <EyeOff className="mr-1.5 h-4 w-4" />
          : <Eye className="mr-1.5 h-4 w-4" />}
        {showPreview ? "Hide Preview" : "Preview"}
      </Button>

      <Button variant="outline" size="sm" onClick={onSaveDraft} disabled={isPending}>
        {isPending
          ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          : <Clock className="mr-1.5 h-4 w-4" />}
        Save Draft
      </Button>

      <Button size="sm" onClick={onPublish} disabled={isPending}>
        {isPending
          ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          : <Globe className="mr-1.5 h-4 w-4" />}
        {isPublished ? "Update & Publish" : "Publish"}
      </Button>
    </div>
  );
}

"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCreateKbPage, useKbTemplates } from "@/lib/api/hooks/knowledge";
import { pageHref } from "@/lib/knowledge/routes";

/**
 * KB-0070: "New page", with the templates behind a second click.
 *
 * A blank page is one click because that is the common case; the template list
 * is there for the times it is not.
 */
export function NewPageButton({
  spaceId,
  parentPageId,
}: {
  spaceId?: number;
  parentPageId?: number;
}) {
  const router = useRouter();
  const createPage = useCreateKbPage();
  const templates = useKbTemplates();

  function create(templateId?: number) {
    createPage.mutate(
      { spaceId, parentPageId, templateId },
      {
        onSuccess: (page) => router.push(pageHref(page.id)),
        onError: (error) => toast.error("Couldn't create the page.", { description: getErrorMessage(error) }),
      },
    );
  }

  return (
    <div className="flex items-center">
      <Button size="sm" onClick={() => create()} disabled={createPage.isPending}>
        <Plus className="h-4 w-4" />
        New page
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="secondary"
            className="ml-1 px-2"
            aria-label="Start from a template"
            disabled={createPage.isPending}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Start from a template</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(templates.data?.items ?? []).slice(0, 15).map((template) => (
            <DropdownMenuItem key={template.id} onSelect={() => create(template.id)}>
              {template.name}
            </DropdownMenuItem>
          ))}
          {templates.data && templates.data.items.length === 0 ? (
            <DropdownMenuItem disabled>No templates yet</DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

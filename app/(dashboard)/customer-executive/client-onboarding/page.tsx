"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CheckSquare, Square, Plus, Trash2, CalendarDays, User, ClipboardList } from "lucide-react";
import { isAdminOrOwner } from "@/lib/constants/roles";
import {
  useClientAccounts,
  useClientOnboardingItems,
  useCreateOnboardingItem,
  useToggleOnboardingItem,
  useDeleteOnboardingItem,
  useOnboardingTemplates,
  useCreateOnboardingTemplate,
} from "@/lib/api/hooks/crm";
import type { ClientAccount } from "@/types/crm";


function ChecklistTab() {
  const [selectedClientId, setSelectedClientId] = useState<number>(0);
  const [newTitle, setNewTitle] = useState("");

  const { data: clientsData } = useClientAccounts();
  const clients = (clientsData?.accounts ?? []) as ClientAccount[];

  const { data: items = [], isLoading } = useClientOnboardingItems(selectedClientId);
  const createItem = useCreateOnboardingItem();
  const toggleItem = useToggleOnboardingItem();
  const deleteItem = useDeleteOnboardingItem();

  const completed = items.filter((i) => i.completedAt !== null).length;
  const total = items.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  function handleAdd() {
    const title = newTitle.trim();
    if (!title || selectedClientId <= 0) return;
    createItem.mutate({ clientId: selectedClientId, title });
    setNewTitle("");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <Label className="mb-2 block text-sm font-medium">Select Client</Label>
          <Select
            value={selectedClientId > 0 ? String(selectedClientId) : ""}
            onValueChange={(v) => setSelectedClientId(Number(v))}
          >
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Choose a client…" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.clientName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedClientId > 0 && (
        <>
          {total > 0 && (
            <Card>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {completed} / {total} completed
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                Onboarding Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No items yet. Add the first task below.
                </p>
              ) : (
                <ScrollArea className="w-full" type="auto">
                  <div className="space-y-1 min-w-[300px]">
                    {items.map((item) => {
                      const isDone = item.completedAt !== null;
                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 rounded-md px-3 py-2 hover:bg-muted/50 group"
                        >
                          <button
                            type="button"
                            aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                            className="mt-0.5 shrink-0 text-primary"
                            onClick={() =>
                              toggleItem.mutate({
                                id: item.id,
                                completed: !isDone,
                                clientId: selectedClientId,
                              })
                            }
                          >
                            {isDone ? (
                              <CheckSquare className="h-5 w-5 text-green-500" />
                            ) : (
                              <Square className="h-5 w-5" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium leading-snug ${
                                isDone ? "line-through text-muted-foreground" : ""
                              }`}
                            >
                              {item.title}
                            </p>
                            <div className="flex flex-wrap gap-3 mt-0.5">
                              {item.dueDate && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <CalendarDays className="h-3 w-3" />
                                  {new Date(item.dueDate).toLocaleDateString()}
                                </span>
                              )}
                              {item.assignee?.name && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <User className="h-3 w-3" />
                                  {item.assignee.name}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            aria-label="Delete item"
                            className="opacity-0 group-hover:opacity-100 text-destructive ml-1 shrink-0"
                            onClick={() =>
                              deleteItem.mutate({ id: item.id, clientId: selectedClientId })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <Input
                  placeholder="Add a checklist item…"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                  }}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleAdd}
                  disabled={!newTitle.trim() || createItem.isPending}
                  aria-label="Add item"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}


function TemplatesTab() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const { data: templates = [], isLoading } = useOnboardingTemplates();
  const createTemplate = useCreateOnboardingTemplate();

  function handleCreate() {
    if (!name.trim()) return;
    createTemplate.mutate(
      { name: name.trim(), description: description.trim() || undefined, isDefault },
      {
        onSuccess: () => {
          setSheetOpen(false);
          setName("");
          setDescription("");
          setIsDefault(false);
        },
      }
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Template
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No templates yet. Create one to quickly populate checklists.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="pt-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{t.name}</p>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                  )}
                </div>
                {t.isDefault && (
                  <Badge variant="secondary" className="shrink-0">
                    Default
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New Onboarding Template</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Name *</Label>
              <Input
                id="tpl-name"
                placeholder="Template name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-desc">Description</Label>
              <Textarea
                id="tpl-desc"
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="tpl-default"
                checked={isDefault}
                onCheckedChange={setIsDefault}
              />
              <Label htmlFor="tpl-default">Set as default template</Label>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || createTemplate.isPending}
              className="flex-1"
            >
              Create
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}


export default function ClientOnboardingPage() {
  const { data: session } = useSession();
  const isAdmin = isAdminOrOwner(session?.user?.role);

  return (
    <PageWrapper
      title="Client Onboarding"
      subtitle="Track and manage onboarding checklists for each client"
    >
      <Tabs defaultValue="checklists" className="space-y-4">
        <TabsList>
          <TabsTrigger value="checklists">Client Checklists</TabsTrigger>
          {isAdmin && <TabsTrigger value="templates">Templates</TabsTrigger>}
        </TabsList>

        <TabsContent value="checklists">
          <ChecklistTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="templates">
            <TemplatesTab />
          </TabsContent>
        )}
      </Tabs>
    </PageWrapper>
  );
}

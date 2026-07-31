"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CustomFieldDefinition } from "@/lib/api/hooks/crm";

interface CustomFieldsFormProps {
  fields: CustomFieldDefinition[];
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
}

export function CustomFieldsForm({ fields, values, onChange }: CustomFieldsFormProps) {
  const activeFields = fields
    .filter((f) => f.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (activeFields.length === 0) return null;

  return (
    <div className="space-y-4">
      {activeFields.map((field) => {
        const value = values[field.name];

        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={`cf-${field.name}`}>
              {field.label}
              {field.isRequired && (
                <span className="ml-1 text-destructive" aria-hidden="true">
                  *
                </span>
              )}
            </Label>

            {field.fieldType === "text" && (
              <Input
                id={`cf-${field.name}`}
                type="text"
                value={typeof value === "string" ? value : ""}
                onChange={(e) => onChange(field.name, e.target.value)}
                required={field.isRequired}
              />
            )}

            {field.fieldType === "number" && (
              <Input
                id={`cf-${field.name}`}
                type="number"
                value={typeof value === "number" ? value : ""}
                onChange={(e) =>
                  onChange(field.name, e.target.value === "" ? "" : Number(e.target.value))
                }
                required={field.isRequired}
              />
            )}

            {field.fieldType === "date" && (
              <Input
                id={`cf-${field.name}`}
                type="date"
                value={typeof value === "string" ? value : ""}
                onChange={(e) => onChange(field.name, e.target.value)}
                required={field.isRequired}
              />
            )}

            {field.fieldType === "boolean" && (
              <div className="flex items-center gap-2">
                <Switch
                  id={`cf-${field.name}`}
                  checked={value === true}
                  onCheckedChange={(checked) => onChange(field.name, checked)}
                />
                <Label htmlFor={`cf-${field.name}`} className="cursor-pointer text-muted-foreground text-sm">
                  {value === true ? "Yes" : "No"}
                </Label>
              </div>
            )}

            {field.fieldType === "select" && (
              <Select
                value={typeof value === "string" ? value : ""}
                onValueChange={(v) => onChange(field.name, v)}
              >
                <SelectTrigger id={`cf-${field.name}`}>
                  <SelectValue placeholder={`Select ${field.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        );
      })}
    </div>
  );
}

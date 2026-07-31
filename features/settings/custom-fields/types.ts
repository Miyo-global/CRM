export type EntityType = "lead" | "deal" | "contact";
export type FieldType = "text" | "number" | "date" | "boolean" | "select";

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldFormState {
  label: string;
  name: string;
  fieldType: FieldType;
  options: SelectOption[];
  isRequired: boolean;
  sortOrder: number;
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  boolean: "Yes / No",
  select: "Dropdown",
};

export function autoName(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

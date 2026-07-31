"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, MapPin, Phone, Mail, Pencil, Trash2, Check, ChevronsUpDown, ArrowLeft } from "lucide-react";
import { useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch } from "@/lib/api/hooks/branches";
import { getStatesForCountry, hasStatesForCountry } from "@/lib/data/country-states";
import { getIndianCitiesForState } from "@/lib/data/india-locations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Branch } from "@/types/organization";
import { isOptionalPhoneValid } from "@/lib/phone";
import {
  hasMeaningfulContent,
  isAllowedName,
  NAME_ALLOWED_HINT,
  sanitizeName,
} from "@/lib/validations/text-rules";

const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada", "Australia",
  "Singapore", "UAE", "Germany", "France", "Japan", "China", "Brazil",
  "South Africa", "Netherlands", "Sweden", "Switzerland", "New Zealand",
  "Malaysia", "Indonesia", "Philippines", "Thailand", "Bangladesh",
  "Pakistan", "Sri Lanka", "Nepal", "Kenya", "Nigeria", "Ghana",
];

const EMPTY_FORM = {
  name: "", code: "", city: "", state: "", country: "India",
  pincode: "", address: "", phone: "", email: "",
};

const CODE_REGEX = /^[A-Z0-9-]{2,20}$/;
const NAME_REGEX = /^[A-Za-z0-9\s\-'.&]+$/;
const CITY_STATE_REGEX = /^[A-Za-z\s\-'.]+$/;
const STATE_REGEX = /^[\p{L}0-9\s\-'.()&]+$/u;
const STATE_HAS_LETTER_REGEX = /\p{L}/u;
const PINCODE_REGEX = /^[A-Za-z0-9 -]{3,12}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BRANCH_ADDRESS_MAX = 200;

const PINCODE_RULES: Record<string, { re: RegExp; msg: string }> = {
  India: { re: /^\d{6}$/, msg: "Indian PIN code must be exactly 6 digits" },
  "United States": { re: /^\d{5}(-\d{4})?$/, msg: "US ZIP code must be 5 digits (e.g. 10001 or 10001-2345)" },
  "United Kingdom": { re: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, msg: "Enter a valid UK postcode (e.g. SW1A 1AA)" },
  Canada: { re: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i, msg: "Enter a valid Canadian postal code (e.g. K1A 0B1)" },
  Australia: { re: /^\d{4}$/, msg: "Australian postcode must be 4 digits" },
  Germany: { re: /^\d{5}$/, msg: "German postcode must be 5 digits" },
  France: { re: /^\d{5}$/, msg: "French postcode must be 5 digits" },
  Japan: { re: /^\d{3}-?\d{4}$/, msg: "Japanese postcode must be 7 digits (e.g. 100-0001)" },
};

function validateAddress(value: string): string | undefined {
  const val = value.trim();
  if (!val) return undefined;
  if (val.length > BRANCH_ADDRESS_MAX) return `Address cannot exceed ${BRANCH_ADDRESS_MAX} characters`;
  if (!hasMeaningfulContent(val)) return "Address must contain letters or numbers";
  if (!isAllowedName(val)) return `Address can only contain ${NAME_ALLOWED_HINT}`;
  return undefined;
}

function validatePincode(pincode: string, country: string): string | undefined {
  if (!pincode) return undefined;
  const rule = PINCODE_RULES[country];
  if (rule) return rule.re.test(pincode) ? undefined : rule.msg;
  if (!PINCODE_REGEX.test(pincode)) return "Enter a valid pin/zip code (3–12 alphanumeric characters)";
  if (!/[A-Za-z0-9]/.test(pincode)) return "Pin/ZIP code must contain at least one letter or number";
  return undefined;
}

type FormErrors = Partial<Record<keyof typeof EMPTY_FORM, string>>;

interface StateComboboxProps {
  country: string;
  value: string;
  onValueChange: (value: string) => void;
  invalid?: boolean;
}

function StateCombobox({ country, value, onValueChange, invalid }: StateComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const states = getStatesForCountry(country);
  const curated = hasStatesForCountry(country);

  const trimmedQuery = query.trim();
  const queryMatchesOption =
    trimmedQuery.length > 0 &&
    states.some((s) => s.toLowerCase() === trimmedQuery.toLowerCase());
  const showCustomOption = trimmedQuery.length > 0 && !queryMatchesOption;

  const commit = useCallback(
    (next: string) => {
      onValueChange(next);
      setQuery("");
      setOpen(false);
    },
    [onValueChange],
  );

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setQuery("");
  }, []);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className={cn(
            "h-9 w-full justify-between text-sm font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <span className="truncate text-left">
            {value || (curated ? "Select state" : "Enter state / region")}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onWheel={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={curated}>
          <CommandInput
            placeholder={curated ? "Search or type a state…" : "Type a state / region…"}
            className="h-9"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-[min(260px,60vh)]">
            {curated && !showCustomOption && (
              <CommandEmpty>No matches. Keep typing to add a custom value.</CommandEmpty>
            )}
            {curated && states.length > 0 && (
              <CommandGroup>
                {states.map((s) => (
                  <CommandItem key={s} value={s} keywords={[s]} onSelect={() => commit(s)}>
                    <Check className={cn("mr-2 h-3.5 w-3.5 shrink-0", value === s ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{s}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showCustomOption && (
              <CommandGroup heading={curated ? "Custom" : undefined}>
                <CommandItem
                  value={`__use__${trimmedQuery}`}
                  keywords={[trimmedQuery]}
                  onSelect={() => commit(trimmedQuery)}
                >
                  <Check className="mr-2 h-3.5 w-3.5 shrink-0 opacity-0" />
                  <span className="truncate">Use &ldquo;{trimmedQuery}&rdquo;</span>
                </CommandItem>
              </CommandGroup>
            )}
            {!curated && !showCustomOption && (
              <CommandEmpty>Start typing to enter a state or region.</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function BranchManagementPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
      <BranchManagementContent />
    </DashboardGate>
  );
}

function BranchManagementContent() {
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editFormData, setEditFormData] = useState({ ...EMPTY_FORM });
  const [editFormErrors, setEditFormErrors] = useState<FormErrors>({});

  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);

  const { data: branchList, isLoading } = useBranches();
  const createMutation = useCreateBranch();
  const updateMutation = useUpdateBranch();
  const deleteMutation = useDeleteBranch();

  const branches = branchList ?? [];

  useEffect(() => {
    if (editingBranch) {
      setEditFormData({
        name: editingBranch.name ?? "",
        code: editingBranch.code ?? "",
        city: editingBranch.city ?? "",
        state: editingBranch.state ?? "",
        country: editingBranch.country ?? "India",
        pincode: editingBranch.pincode ?? "",
        address: editingBranch.address ?? "",
        phone: editingBranch.phone ?? "",
        email: editingBranch.email ?? "",
      });
      setEditFormErrors({});
    }
  }, [editingBranch]);

  const set = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = key === "code" ? e.target.value.toUpperCase() : e.target.value;
    setFormData((f) => ({ ...f, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const setEdit = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = key === "code" ? e.target.value.toUpperCase() : e.target.value;
    setEditFormData((f) => ({ ...f, [key]: value }));
    setEditFormErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const setSelectField = useCallback((key: keyof typeof EMPTY_FORM, value: string) => {
    setFormData((f) => {
      const next = { ...f, [key]: value };
      if (key === "country") {
        next.state = "";
        next.city = "";
      } else if (key === "state" && f.country === "India") {
        next.city = "";
      }
      return next;
    });
    setFormErrors((prev) => ({ ...prev, [key]: undefined, ...(key === "country" ? { state: undefined, city: undefined } : key === "state" ? { city: undefined } : {}) }));
  }, []);

  const setEditSelectField = useCallback((key: keyof typeof EMPTY_FORM, value: string) => {
    setEditFormData((f) => {
      const next = { ...f, [key]: value };
      if (key === "country") {
        next.state = "";
        next.city = "";
      } else if (key === "state" && f.country === "India") {
        next.city = "";
      }
      return next;
    });
    setEditFormErrors((prev) => ({ ...prev, [key]: undefined, ...(key === "country" ? { state: undefined, city: undefined } : key === "state" ? { city: undefined } : {}) }));
  }, []);

  const setFormPhone = useCallback((value: string) => {
    setFormData((f) => ({ ...f, phone: value }));
    setFormErrors((prev) => ({ ...prev, phone: undefined }));
  }, []);

  const setEditFormPhone = useCallback((value: string) => {
    setEditFormData((f) => ({ ...f, phone: value }));
    setEditFormErrors((prev) => ({ ...prev, phone: undefined }));
  }, []);

  const setFormAddress = useCallback((value: string) => {
    setFormData((f) => ({ ...f, address: sanitizeName(value).slice(0, BRANCH_ADDRESS_MAX) }));
    setFormErrors((prev) => ({ ...prev, address: undefined }));
  }, []);

  const setEditFormAddress = useCallback((value: string) => {
    setEditFormData((f) => ({ ...f, address: sanitizeName(value).slice(0, BRANCH_ADDRESS_MAX) }));
    setEditFormErrors((prev) => ({ ...prev, address: undefined }));
  }, []);

  const handleOpenCreate = useCallback(() => setShowCreate(true), []);
  const handleCloseCreate = useCallback(() => {
    setShowCreate(false);
    setFormData({ ...EMPTY_FORM });
    setFormErrors({});
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditingBranch(null);
    setEditFormData({ ...EMPTY_FORM });
    setEditFormErrors({});
  }, []);

  const blurField = useCallback((
    key: keyof typeof EMPTY_FORM,
    data: typeof EMPTY_FORM,
    setErrors: React.Dispatch<React.SetStateAction<FormErrors>>,
  ) => () => {
    const raw = data[key];
    const val = key === "code" ? raw.trim().toUpperCase() : raw.trim();
    if (!val) return;
    let e: string | undefined;
    if (key === "name") {
      if (val.length < 2) e = "At least 2 characters required";
      else if (val.length > 100) e = "Cannot exceed 100 characters";
      else if (!NAME_REGEX.test(val)) e = "Only letters, numbers, spaces, hyphens, and apostrophes";
      else if (!/[A-Za-z0-9]/.test(val)) e = "Must contain at least one letter or number";
    } else if (key === "code") {
      if (!CODE_REGEX.test(val)) e = "Use 2–20 uppercase letters, numbers, or hyphen";
      else if (!/[A-Z0-9]/.test(val)) e = "Must contain at least one letter or number";
    } else if (key === "city") {
      if (val.length > 100) e = "Cannot exceed 100 characters";
      else if (!CITY_STATE_REGEX.test(val)) e = "Only letters, spaces, and hyphens";
      else if (!/[A-Za-z]/.test(val)) e = "Must contain at least one letter";
    } else if (key === "pincode") {
      e = validatePincode(val, data.country);
    } else if (key === "address") {
      e = validateAddress(val);
    } else if (key === "email") {
      if (!EMAIL_REGEX.test(val)) e = "Enter a valid email address";
    }
    setErrors(prev => ({ ...prev, [key]: e }));
  }, []);

  const validateForm = (data: typeof EMPTY_FORM, setErrors: (e: FormErrors) => void) => {
    const trimmed = {
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      city: data.city.trim(),
      state: data.state.trim(),
      country: data.country.trim(),
      pincode: data.pincode.trim(),
      address: data.address.trim(),
      phone: data.phone.trim(),
      email: data.email.trim().toLowerCase(),
    };

    const errors: FormErrors = {};

    if (!trimmed.name) {
      errors.name = "Branch name is required";
    } else if (trimmed.name.length < 2) {
      errors.name = "Branch name must be at least 2 characters";
    } else if (trimmed.name.length > 100) {
      errors.name = "Branch name cannot exceed 100 characters";
    } else if (!NAME_REGEX.test(trimmed.name)) {
      errors.name = "Branch name can only contain letters, numbers, spaces, hyphens, and apostrophes";
    } else if (!/[A-Za-z0-9]/.test(trimmed.name)) {
      errors.name = "Branch name must contain at least one letter or number";
    }

    if (!trimmed.code) {
      errors.code = "Branch code is required";
    } else if (!CODE_REGEX.test(trimmed.code)) {
      errors.code = "Use 2–20 characters: A–Z, numbers, or hyphen only";
    } else if (!/[A-Z0-9]/.test(trimmed.code)) {
      errors.code = "Code must contain at least one letter or number";
    }

    if (trimmed.city) {
      if (trimmed.city.length > 100) errors.city = "City name cannot exceed 100 characters";
      else if (!CITY_STATE_REGEX.test(trimmed.city)) errors.city = "City can only contain letters, spaces, and hyphens";
      else if (!/[A-Za-z]/.test(trimmed.city)) errors.city = "City name must contain at least one letter";
    }

    if (trimmed.state) {
      if (trimmed.state.length > 100) errors.state = "State name cannot exceed 100 characters";
      else if (!STATE_REGEX.test(trimmed.state)) errors.state = "State contains invalid characters";
      else if (!STATE_HAS_LETTER_REGEX.test(trimmed.state)) errors.state = "State name must contain at least one letter";
    }

    if (trimmed.address) {
      const addressError = validateAddress(trimmed.address);
      if (addressError) errors.address = addressError;
    }

    if (trimmed.email && !EMAIL_REGEX.test(trimmed.email)) {
      errors.email = "Enter a valid email address";
    }

    if (!isOptionalPhoneValid(trimmed.phone)) {
      errors.phone = "Enter a valid phone number";
    }

    const pincodeError = validatePincode(trimmed.pincode, trimmed.country ?? "");
    if (pincodeError) errors.pincode = pincodeError;

    setErrors(errors);
    if (Object.keys(errors).length > 0) return null;
    return trimmed;
  };

  const handleCreate = () => {
    const validData = validateForm(formData, setFormErrors);
    if (!validData) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    createMutation.mutate(validData, {
      onSuccess: () => {
        toast.success("Branch created successfully");
        setShowCreate(false);
        setFormData({ ...EMPTY_FORM });
        setFormErrors({});
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleUpdate = () => {
    if (!editingBranch) return;
    const validData = validateForm(editFormData, setEditFormErrors);
    if (!validData) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    updateMutation.mutate(
      { id: editingBranch.id, ...validData },
      {
        onSuccess: () => {
          toast.success("Branch updated successfully");
          setEditingBranch(null);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleDelete = () => {
    if (!deletingBranch) return;
    deleteMutation.mutate(deletingBranch.id, {
      onSuccess: () => {
        toast.success("Branch deleted");
        setDeletingBranch(null);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const branchFormFields = (
    data: typeof EMPTY_FORM,
    setter: (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => void,
    selectSetter: (key: keyof typeof EMPTY_FORM, value: string) => void,
    errors: FormErrors,
    onPhoneChange: (value: string) => void,
    onAddressChange: (value: string) => void,
    setErrors: React.Dispatch<React.SetStateAction<FormErrors>>,
  ) => {
    const isIndia = data.country === "India";
    const indianCityOptions = isIndia ? [...getIndianCitiesForState(data.state)] : [];
    const blur = (key: keyof typeof EMPTY_FORM) => blurField(key, data, setErrors);
    const errClass = (key: keyof typeof EMPTY_FORM) =>
      errors[key] ? "border-destructive focus-visible:ring-destructive/30" : "";

    return (
      <div className="px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Branch Name *</Label>
            <Input
              value={data.name}
              onChange={setter("name")}
              onBlur={blur("name")}
              className={errClass("name")}
              aria-invalid={!!errors.name}
              placeholder="e.g., Mumbai Office"
              maxLength={100}
            />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Branch Code *</Label>
            <Input
              value={data.code}
              onChange={setter("code")}
              onBlur={blur("code")}
              className={errClass("code")}
              aria-invalid={!!errors.code}
              placeholder="e.g., MUM-01"
              maxLength={20}
            />
            {errors.code && <p className="text-[11px] text-destructive">{errors.code}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Country</Label>
          <SearchableSelect
            options={COUNTRIES.map((c) => ({ value: c, label: c }))}
            value={data.country}
            onValueChange={(v) => selectSetter("country", v)}
            placeholder="Select country"
            searchPlaceholder="Search country…"
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">State / Region</Label>
            <StateCombobox
              key={data.country}
              country={data.country}
              value={data.state}
              onValueChange={(v) => selectSetter("state", v)}
              invalid={!!errors.state}
            />
            {errors.state && <p className="text-[11px] text-destructive">{errors.state}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">City</Label>
            {isIndia ? (
              <SearchableCombobox
                options={indianCityOptions}
                value={data.city}
                onValueChange={(v) => selectSetter("city", v)}
                placeholder={data.state ? "Search city…" : "Select state first"}
                searchPlaceholder="Search cities…"
                emptyMessage={data.state ? "No city found." : "Select a state first."}
                disabled={!data.state}
                aria-label="Branch city"
                aria-invalid={!!errors.city}
                className={errClass("city")}
              />
            ) : (
              <Input
                value={data.city}
                onChange={setter("city")}
                onBlur={blur("city")}
                className={errClass("city")}
                aria-invalid={!!errors.city}
                placeholder="e.g., Mumbai"
                maxLength={100}
              />
            )}
            {errors.city && <p className="text-[11px] text-destructive">{errors.city}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Pin / ZIP Code</Label>
          <Input
            value={data.pincode}
            onChange={setter("pincode")}
            onBlur={blur("pincode")}
            className={errClass("pincode")}
            aria-invalid={!!errors.pincode}
            placeholder={isIndia ? "e.g., 400001" : "e.g., 10001"}
            maxLength={12}
          />
          {errors.pincode && <p className="text-[11px] text-destructive">{errors.pincode}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Address</Label>
          <Input
            value={data.address}
            onChange={(e) => onAddressChange(e.target.value)}
            onBlur={blur("address")}
            className={errClass("address")}
            aria-invalid={!!errors.address}
            placeholder="Full street address"
            maxLength={BRANCH_ADDRESS_MAX}
          />
          {errors.address ? (
            <p className="text-[11px] text-destructive">{errors.address}</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Up to {BRANCH_ADDRESS_MAX} characters. {NAME_ALLOWED_HINT}.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Phone</Label>
            <PhoneInput value={data.phone} onChange={(v) => onPhoneChange(v ?? "")} />
            {errors.phone && <p className="text-[11px] text-destructive">{errors.phone}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input
              value={data.email}
              onChange={setter("email")}
              onBlur={blur("email")}
              className={errClass("email")}
              aria-invalid={!!errors.email}
              placeholder="branch@company.com"
              type="email"
            />
            {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <PageWrapper
      title="Branch Management"
      subtitle="Manage your organization's branch offices"
      badge={branches.length > 0 ? String(branches.length) : undefined}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/branches">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back
            </Link>
          </Button>
          <Button onClick={handleOpenCreate} className="bg-gold hover:bg-gold/80 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Branch
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : branches.length === 0 ? (
        <EmptyState
          illustration={<EmptyTeamIllustration className="h-32 w-32 opacity-95" />}
          title="No branches yet"
          description="Create a branch to set up your multi-branch hierarchy."
          action={{ label: "Add Branch", onClick: handleOpenCreate }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <Card key={branch.id} className="hover:border-gold/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{branch.name}</CardTitle>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{branch.code}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className={cn("text-[10px]",
                      branch.status === "ACTIVE" ? "text-emerald-400 bg-emerald-500/10" : "text-muted-foreground"
                    )}>
                      {branch.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditingBranch(branch)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeletingBranch(branch)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                {(branch.city || branch.state) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {[branch.city, branch.state, branch.country].filter(Boolean).join(", ")}
                    {branch.pincode && <span className="font-mono">— {branch.pincode}</span>}
                  </p>
                )}
                {branch.address && (
                  <p className="text-xs text-muted-foreground">{branch.address}</p>
                )}
                {branch.phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3 w-3 shrink-0" /> {branch.phone}
                  </p>
                )}
                {branch.email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3 w-3 shrink-0" /> {branch.email}
                  </p>
                )}

                <div className="pt-2 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Branch Manager</span>
                    {branch.branchManager ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[8px]">{branch.branchManager.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{branch.branchManager.name}</span>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">Not assigned</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Branch HR</span>
                    {branch.branchHr ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[8px]">{branch.branchHr.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{branch.branchHr.name}</span>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">Not assigned</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>

      <Sheet open={showCreate} onOpenChange={(open) => { if (!open) handleCloseCreate(); else setShowCreate(true); }}>
        <SheetContent className="sm:max-w-md p-0 gap-0">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="text-sm">Create Branch</SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            {branchFormFields(formData, set, setSelectField, formErrors, setFormPhone, setFormAddress, setFormErrors)}
          </ScrollArea>

          <div className="shrink-0 border-t px-4 py-3 bg-background">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleCloseCreate}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={!formData.name || !formData.code || createMutation.isPending}
                onClick={handleCreate}
              >
                {createMutation.isPending ? "Creating…" : "Create Branch"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!editingBranch} onOpenChange={(open) => { if (!open) handleCloseEdit(); }}>
        <SheetContent className="sm:max-w-md p-0 gap-0">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="text-sm">Edit Branch</SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            {branchFormFields(editFormData, setEdit, setEditSelectField, editFormErrors, setEditFormPhone, setEditFormAddress, setEditFormErrors)}
          </ScrollArea>

          <div className="shrink-0 border-t px-4 py-3 bg-background">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleCloseEdit}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={!editFormData.name || !editFormData.code || updateMutation.isPending}
                onClick={handleUpdate}
              >
                {updateMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deletingBranch}
        onOpenChange={(open) => { if (!open) setDeletingBranch(null); }}
        title="Delete Branch"
        description={`Are you sure you want to delete "${deletingBranch?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}

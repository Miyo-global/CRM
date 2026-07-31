"use client";

import { useState } from "react";
import type { Value as PhoneValue } from "react-phone-number-input";
import {
  Mail, MapPin, Building2, User, Target,
  IndianRupee, StickyNote, Share2, Megaphone, Globe, Footprints, Flame, Sun, Snowflake, Users,
  UserPlus, Phone, AlertTriangle,
} from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";
import { useCheckLeadDuplicates } from "@/lib/api/hooks/leads";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus } from "lucide-react";

interface CreateLeadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
}

export function CreateLeadSheet({ open, onOpenChange, onSubmit, isPending }: CreateLeadSheetProps) {
  const [priority, setPriority] = useState<string>("WARM");
  const [source, setSource] = useState<string>("referral");
  const [phone, setPhone] = useState<PhoneValue | undefined>();
  const [emailInput, setEmailInput] = useState("");

  const debouncedEmail = useDebouncedValue(emailInput, 500);
  const debouncedPhone = useDebouncedValue(phone ?? "", 500);

  const { data: dupCheck } = useCheckLeadDuplicates(
    { email: debouncedEmail || undefined, phone: debouncedPhone || undefined },
    { enabled: open && (!!debouncedEmail || !!debouncedPhone) },
  );
  const hasDuplicates = (dupCheck?.duplicates?.length ?? 0) > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button className="bg-gold hover:bg-gold/90 text-white shadow-lg">
          <Plus className="h-4 w-4 mr-2" />
          New Lead
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col p-0 sm:max-w-[480px]">

        <SheetHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-gold" />
            </div>
            <div>
              <SheetTitle className="text-lg font-semibold">Create New Lead</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Add a new lead to your pipeline</p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <form
            id="create-lead-form"
            action={(formData) => {
              formData.set("priority", priority);
              formData.set("source", source);
              if (phone) formData.set("phone", phone);
              onSubmit(formData);
            }}
            className="px-6 py-4 space-y-4"
          >

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Contact Information</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="name" className="text-xs font-medium mb-1.5 block">
                    Full Name <span className="text-red-400">*</span>
                  </Label>
                  <Input id="name" name="name" required placeholder="Enter full name" className="h-9" />
                </div>
                <div>
                  <Label htmlFor="email" className="text-xs font-medium mb-1.5 block">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      className="pl-9 h-9"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs font-medium mb-1.5 block">Phone</Label>
                  <PhoneInput
                    id="phone"
                    defaultCountry="IN"
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={setPhone}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="company" className="text-xs font-medium mb-1.5 block">Company</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="company" name="company" placeholder="Acme Corp" className="pl-9 h-9" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="city" className="text-xs font-medium mb-1.5 block">City</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="city" name="city" placeholder="Mumbai" className="pl-9 h-9" />
                  </div>
                </div>
              </div>
            </div>

            {hasDuplicates && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    Possible duplicate{dupCheck!.duplicates.length > 1 ? "s" : ""} found
                  </span>
                </div>
                <div className="space-y-1.5">
                  {dupCheck!.duplicates.map((dup) => (
                    <div key={dup.id} className="flex items-center justify-between text-[11px]">
                      <span className="font-medium truncate">{dup.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {dup.email && <span className="text-muted-foreground">{dup.email}</span>}
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{dup.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">You can still create this lead if it&apos;s a different person.</p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Target className="h-4 w-4" />
                <span>Lead Classification</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="w-full h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HOT">
                        <span className="flex items-center gap-2">
                          <Flame className="h-3.5 w-3.5 text-red-400" /> Hot
                        </span>
                      </SelectItem>
                      <SelectItem value="WARM">
                        <span className="flex items-center gap-2">
                          <Sun className="h-3.5 w-3.5 text-amber-400" /> Warm
                        </span>
                      </SelectItem>
                      <SelectItem value="COLD">
                        <span className="flex items-center gap-2">
                          <Snowflake className="h-3.5 w-3.5 text-blue-400" /> Cold
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Source</Label>
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger className="w-full h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="referral">
                        <span className="flex items-center gap-2"><Share2 className="h-3.5 w-3.5" /> Referral</span>
                      </SelectItem>
                      <SelectItem value="campaign">
                        <span className="flex items-center gap-2"><Megaphone className="h-3.5 w-3.5" /> Campaign</span>
                      </SelectItem>
                      <SelectItem value="cold_call">
                        <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> Cold Call</span>
                      </SelectItem>
                      <SelectItem value="website">
                        <span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Website</span>
                      </SelectItem>
                      <SelectItem value="social_media">
                        <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Social Media</span>
                      </SelectItem>
                      <SelectItem value="walk_in">
                        <span className="flex items-center gap-2"><Footprints className="h-3.5 w-3.5" /> Walk-in</span>
                      </SelectItem>
                      <SelectItem value="other">
                        <span className="flex items-center gap-2"><Target className="h-3.5 w-3.5" /> Other</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {source === "referral" && (
                  <div className="col-span-2">
                    <Label htmlFor="referredBy" className="text-xs font-medium mb-1.5 block">
                      Referred By <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="referredBy"
                        name="referredBy"
                        required
                        placeholder="Name of person who referred this lead"
                        className="pl-9 h-9"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <IndianRupee className="h-4 w-4" />
                <span>Financial Details</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="potentialValue" className="text-xs font-medium mb-1.5 block">Potential Value (₹)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="potentialValue"
                      name="potentialValue"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="5,00,000"
                      className="pl-9 h-9"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="investmentInterest" className="text-xs font-medium mb-1.5 block">
                    Investment Interest (₹)
                  </Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="investmentInterest"
                      name="investmentInterest"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="10,00,000"
                      className="pl-9 h-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <StickyNote className="h-4 w-4" />
                <span>Additional Notes</span>
              </div>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any additional context about this lead..."
                rows={3}
                className="resize-none"
              />
            </div>
          </form>
        </ScrollArea>

        <SheetFooter className="px-6 py-3 border-t shrink-0">
          <Button type="button" variant="outline" className="flex-1 h-9" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="create-lead-form" className="flex-1 bg-gold hover:bg-gold/90 text-white h-9" disabled={isPending}>
            {isPending ? "Creating..." : "Create Lead"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

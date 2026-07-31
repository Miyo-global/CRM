"use client";

import { useState } from "react";
import { Phone, Mail, MessageSquare, Calendar, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ActivityFormProps {
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
}

export function ActivityForm({ onSubmit, isPending }: ActivityFormProps) {
  const [activityType, setActivityType] = useState<string>("call");

  return (
    <form
      action={(formData) => {
        formData.set("activityType", activityType);
        onSubmit(formData);
      }}
      className="space-y-4"
    >
      <div>
        <Label className="text-xs font-medium mb-2 block">Activity Type</Label>
        <Select value={activityType} onValueChange={setActivityType}>
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="call">
              <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> Phone Call</span>
            </SelectItem>
            <SelectItem value="email">
              <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Email</span>
            </SelectItem>
            <SelectItem value="whatsapp">
              <span className="flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5" /> WhatsApp</span>
            </SelectItem>
            <SelectItem value="meeting">
              <span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Meeting</span>
            </SelectItem>
            <SelectItem value="site_visit">
              <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Site Visit</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="subject" className="text-xs font-medium mb-2 block">Subject</Label>
        <Input id="subject" name="subject" placeholder="Brief description" className="h-10" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="duration" className="text-xs font-medium mb-2 block">Duration (min)</Label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="duration" name="duration" type="number" placeholder="30" className="pl-9 h-10" />
          </div>
        </div>
        <div>
          <Label htmlFor="outcome" className="text-xs font-medium mb-2 block">Outcome</Label>
          <Input id="outcome" name="outcome" placeholder="Positive / Negative" className="h-10" />
        </div>
      </div>

      <div>
        <Label htmlFor="activityNotes" className="text-xs font-medium mb-2 block">Notes</Label>
        <Textarea
          id="activityNotes"
          name="activityNotes"
          rows={3}
          placeholder="What happened during this interaction?"
          className="resize-none"
        />
      </div>

      <div>
        <Label htmlFor="location" className="text-xs font-medium mb-2 block">
          Location (for meetings/visits)
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input id="location" name="location" placeholder="Office / Client location" className="pl-9 h-10" />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-gold hover:bg-gold/90 text-white h-10 mt-2"
        disabled={isPending}
      >
        {isPending ? "Logging..." : "Log Activity"}
      </Button>
    </form>
  );
}

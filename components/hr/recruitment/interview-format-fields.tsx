"use client";

import { Video, Phone, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  INTERVIEW_FORMATS,
  type InterviewFormat,
  showsLocationForFormat,
  showsMeetingLinkForFormat,
} from "@/lib/constants/interview-format";

const FORMAT_ICONS = {
  VIDEO: Video,
  PHONE: Phone,
  IN_PERSON: MapPin,
} as const;

interface InterviewFormatFieldsProps {
  format: InterviewFormat;
  onFormatChange: (format: InterviewFormat) => void;
  meetingLink: string;
  onMeetingLinkChange: (value: string) => void;
  location: string;
  onLocationChange: (value: string) => void;
}

export function InterviewFormatFields({
  format,
  onFormatChange,
  meetingLink,
  onMeetingLinkChange,
  location,
  onLocationChange,
}: InterviewFormatFieldsProps) {
  const handleFormatChange = (next: InterviewFormat) => {
    onFormatChange(next);
    if (!showsMeetingLinkForFormat(next)) onMeetingLinkChange("");
    if (!showsLocationForFormat(next)) onLocationChange("");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Interview Mode <span className="text-destructive">*</span>
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Interview mode">
          {INTERVIEW_FORMATS.map(({ value, label }) => {
            const Icon = FORMAT_ICONS[value];
            const selected = format === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleFormatChange(value)}
                aria-pressed={selected}
                className={cn(
                  "flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-sm font-medium transition-colors focus-ring",
                  selected
                    ? "border-primary bg-brand-soft text-brand-soft-foreground"
                    : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {showsMeetingLinkForFormat(format) && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Meeting Link <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="https://meet.google.com/..."
            value={meetingLink}
            onChange={(e) => onMeetingLinkChange(e.target.value)}
          />
        </div>
      )}

      {showsLocationForFormat(format) && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Venue / Address <span className="text-destructive">*</span>
          </label>
          <Textarea
            placeholder="Office address, floor, room number..."
            rows={2}
            className="resize-none"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

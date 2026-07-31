import type { InterviewType } from "@/types/hr";

export const INTERVIEW_FORMATS = [
  { value: "VIDEO", label: "Online" },
  { value: "PHONE", label: "Phone" },
  { value: "IN_PERSON", label: "Onsite" },
] as const;

export type InterviewFormat = (typeof INTERVIEW_FORMATS)[number]["value"];

export function formatToInterviewType(format: InterviewFormat): InterviewType {
  if (format === "IN_PERSON") return "ONSITE";
  return format;
}

export function showsMeetingLinkForFormat(format: InterviewFormat) {
  return format === "VIDEO";
}

export function showsLocationForFormat(format: InterviewFormat) {
  return format === "IN_PERSON";
}

export function normalizeInterviewFormat(mode: string): InterviewFormat {
  if (mode === "PHONE") return "PHONE";
  if (mode === "IN_PERSON" || mode === "ONSITE") return "IN_PERSON";
  return "VIDEO";
}

export function validateInterviewFormatFields(
  format: InterviewFormat,
  meetingLink: string,
  location: string,
): string | null {
  if (format === "VIDEO") {
    if (!meetingLink.trim()) return "Meeting link is required for online interviews";
    try {
      const parsed = new URL(meetingLink);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
    } catch {
      return "Enter a valid meeting link (https://…)";
    }
  }
  if (format === "IN_PERSON" && !location.trim()) {
    return "Address is required for onsite interviews";
  }
  return null;
}

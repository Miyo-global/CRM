import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { toneForKey, toneSoft } from "@/lib/design/tones"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function resolveImageUrl(image: string | null | undefined): string | undefined {
  if (!image) return undefined;
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  if (image.startsWith("/")) return image;
  return `/api/storage/image?key=${encodeURIComponent(image)}`;
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function avatarColorClasses(seed: string | null | undefined): string {
  // Free categorical seed -> tag tone cycle (never danger for a person's avatar).
  return toneSoft[toneForKey(seed ?? "")];
}

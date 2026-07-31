"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { X, Plus, Linkedin, Twitter, Github, Upload, Loader2 } from "lucide-react";
import { useUpdateProfile } from "@/lib/api/hooks/hr";
import { resolveImageUrl } from "@/lib/utils";
import type { Employee } from "@/types/hr";

const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png"] as const;
const AVATAR_ALLOWED_EXTENSIONS = ".jpg,.jpeg,.png";
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const VALID_SKILL_PATTERN = /^[A-Za-z0-9+#.\-\s]+$/;

const HTTPS_REFINE = (v: string) => !v || /^https?:\/\//i.test(v);
const HTTPS_MSG = "URL must start with http:// or https://";

const schema = z.object({
  bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
  linkedinUrl: z.string().url("Must be a valid URL").refine(HTTPS_REFINE, HTTPS_MSG).optional().or(z.literal("")),
  twitterUrl: z.string().url("Must be a valid URL").refine(HTTPS_REFINE, HTTPS_MSG).optional().or(z.literal("")),
  githubUrl: z.string().url("Must be a valid URL").refine(HTTPS_REFINE, HTTPS_MSG).optional().or(z.literal("")),
  newSkill: z.string().optional(),
}).superRefine((data, ctx) => {
  const urls = [
    { field: "linkedinUrl" as const },
    { field: "twitterUrl" as const },
    { field: "githubUrl" as const },
  ];
  const filled = urls.filter((u) => !!data[u.field]?.trim());
  const seen = new Set<string>();
  for (const { field } of filled) {
    const val = data[field]!.trim().toLowerCase().replace(/\/$/, "");
    if (seen.has(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate social link URLs are not allowed",
        path: [field],
      });
    }
    seen.add(val);
  }
});

type FormValues = z.infer<typeof schema>;

interface SelfEditProfileFormProps {
  employee: Employee;
  onSaved?: () => void;
}

export function SelfEditProfileForm({ employee, onSaved }: SelfEditProfileFormProps) {
  const updateProfile = useUpdateProfile();
  const [skills, setSkills] = useState<string[]>(employee.skills ?? []);
  const [imageUrl, setImageUrl] = useState<string>(employee.image ?? "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fullName = `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() || "?";
  const initials = fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      bio: employee.bio ?? "",
      linkedinUrl: employee.linkedinUrl ?? "",
      twitterUrl: employee.twitterUrl ?? "",
      githubUrl: employee.githubUrl ?? "",
      newSkill: "",
    },
  });

  const newSkill = watch("newSkill");

  function addSkill() {
    const trimmed = (newSkill ?? "").trim();
    if (!trimmed) return;

    if (!VALID_SKILL_PATTERN.test(trimmed)) {
      toast.error("Skill can only contain letters, numbers, spaces, +, #, ., -");
      return;
    }

    const normalized = trimmed.toLowerCase();
    const duplicate = skills.some((s) => s.toLowerCase() === normalized);
    if (duplicate) {
      toast.error(`"${trimmed}" is already in your skills list`);
      return;
    }

    setSkills((prev) => [...prev, normalized]);
    setValue("newSkill", "");
  }

  function removeSkill(skill: string) {
    setSkills((prev) => prev.filter((s) => s !== skill));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!AVATAR_ALLOWED_TYPES.includes(file.type as (typeof AVATAR_ALLOWED_TYPES)[number])) {
      toast.error("Only PNG and JPG/JPEG files are allowed for profile photos");
      e.target.value = "";
      return;
    }

    if (file.size > AVATAR_MAX_BYTES) {
      toast.error("Profile photo must be smaller than 5 MB");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "avatars");

      const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
      const json = await res.json() as { url?: string; error?: string };

      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Upload failed");
      }

      const newUrl = json.url;
      setImageUrl(newUrl);
      await updateProfile.mutateAsync({ userId: employee.id, image: newUrl });
      toast.success("Profile photo updated");
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const onSubmit = (values: FormValues) => {
    updateProfile.mutate(
      {
        userId: employee.id,
        image: imageUrl || undefined,
        bio: values.bio,
        linkedinUrl: values.linkedinUrl,
        twitterUrl: values.twitterUrl,
        githubUrl: values.githubUrl,
        skills,
      },
      {
        onSuccess: () => {
          toast.success("Profile updated successfully");
          onSaved?.();
        },
        onError: () => toast.error("Failed to update profile"),
      },
    );
  };

  const initialSkills = employee.skills ?? [];
  const skillsDirty =
    skills.length !== initialSkills.length || skills.some((s, i) => s !== initialSkills[i]);
  const hasPendingEdits = isDirty || skillsDirty;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <Avatar className="h-16 w-16">
                <AvatarImage src={resolveImageUrl(imageUrl || null)} />
                <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Profile Photo
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept={AVATAR_ALLOWED_EXTENSIONS}
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-3.5 w-3.5" />
                {uploading ? "Uploading…" : "Upload Photo"}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                PNG or JPG · Max 5 MB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <Label htmlFor="bio" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bio
          </Label>
          <Textarea
            id="bio"
            {...register("bio")}
            placeholder="Tell your colleagues a bit about yourself…"
            rows={3}
            className="text-sm resize-none"
          />
          <div className="flex justify-between">
            {errors.bio && <p className="text-xs text-destructive">{errors.bio.message}</p>}
            <p className="text-[11px] text-muted-foreground ml-auto">
              {(watch("bio") ?? "").length}/500
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Skills
          </Label>
          <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
            {skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs gap-1 pr-1">
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="ml-0.5 hover:text-destructive"
                  aria-label={`Remove ${skill}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {skills.length === 0 && (
              <p className="text-xs text-muted-foreground">No skills added yet.</p>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              {...register("newSkill")}
              placeholder="Add a skill…"
              className="h-8 text-sm flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
            />
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={addSkill}>
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Letters, numbers, spaces, +, #, ., - allowed. Skills are case-insensitive.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Social Links
          </Label>
          <div className="space-y-2">
            <SocialField
              id="linkedinUrl"
              icon={<Linkedin className="h-3.5 w-3.5 text-blue-600" />}
              placeholder="https://linkedin.com/in/yourhandle"
              error={errors.linkedinUrl?.message}
              {...register("linkedinUrl")}
            />
            <SocialField
              id="twitterUrl"
              icon={<Twitter className="h-3.5 w-3.5 text-sky-500" />}
              placeholder="https://twitter.com/yourhandle"
              error={errors.twitterUrl?.message}
              {...register("twitterUrl")}
            />
            <SocialField
              id="githubUrl"
              icon={<Github className="h-3.5 w-3.5" />}
              placeholder="https://github.com/yourhandle"
              error={errors.githubUrl?.message}
              {...register("githubUrl")}
            />
          </div>
        </CardContent>
      </Card>

      {hasPendingEdits && (
        <div className="sticky bottom-0 z-10 -mx-4 px-4 py-3 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.08)]">
          <Button
            type="submit"
            className="w-full"
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? "Saving…" : "Save Profile"}
          </Button>
        </div>
      )}
    </form>
  );
}


interface SocialFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  icon: React.ReactNode;
  placeholder: string;
  error?: string;
}

const SocialField = ({ id, icon, placeholder, error, ...rest }: SocialFieldProps) => (
  <div>
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center w-7 h-8 shrink-0">{icon}</div>
      <Input id={id} {...rest} placeholder={placeholder} className="h-8 text-sm" />
    </div>
    {error && <p className="text-xs text-destructive mt-0.5 pl-9">{error}</p>}
  </div>
);

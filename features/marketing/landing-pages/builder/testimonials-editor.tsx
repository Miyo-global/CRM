"use client";

import { memo, useCallback } from "react";
import { Loader2, Plus, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { type CrmPageTestimonial } from "@/lib/api/hooks/marketing";


interface TestimonialCardProps {
  testimonial: CrmPageTestimonial;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof CrmPageTestimonial, value: string | number) => void;
}

const TestimonialCard = memo(function TestimonialCard({
  testimonial: t,
  onRemove,
  onUpdate,
}: TestimonialCardProps) {
  const handleRemove = useCallback(() => onRemove(t.id), [onRemove, t.id]);
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onUpdate(t.id, "name", e.target.value),
    [onUpdate, t.id],
  );
  const handleRoleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onUpdate(t.id, "role", e.target.value),
    [onUpdate, t.id],
  );
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => onUpdate(t.id, "text", e.target.value),
    [onUpdate, t.id],
  );

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                value={t.name}
                onChange={handleNameChange}
                placeholder="Jane Doe"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role / Company</Label>
              <Input
                value={t.role ?? ""}
                onChange={handleRoleChange}
                placeholder="CEO, Acme Corp"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive mt-5"
            onClick={handleRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Testimonial Text</Label>
          <Textarea
            value={t.text}
            onChange={handleTextChange}
            placeholder="This service transformed our business..."
            rows={3}
            className="text-sm resize-none"
          />
        </div>

        <StarRating testimonialId={t.id} rating={t.rating ?? 0} onUpdate={onUpdate} />
      </CardContent>
    </Card>
  );
});


interface StarRatingProps {
  testimonialId: string;
  rating: number;
  onUpdate: (id: string, field: keyof CrmPageTestimonial, value: string | number) => void;
}

const STARS = [1, 2, 3, 4, 5] as const;

const StarRating = memo(function StarRating({
  testimonialId,
  rating,
  onUpdate,
}: StarRatingProps) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs">Rating</Label>
      <div className="flex items-center gap-0.5">
        {STARS.map((star) => (
          <StarButton
            key={star}
            star={star}
            active={rating >= star}
            testimonialId={testimonialId}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
  );
});


interface StarButtonProps {
  star: number;
  active: boolean;
  testimonialId: string;
  onUpdate: (id: string, field: keyof CrmPageTestimonial, value: string | number) => void;
}

const StarButton = memo(function StarButton({
  star,
  active,
  testimonialId,
  onUpdate,
}: StarButtonProps) {
  const handleClick = useCallback(
    () => onUpdate(testimonialId, "rating", star),
    [onUpdate, testimonialId, star],
  );
  return (
    <button type="button" onClick={handleClick} className="focus:outline-none">
      <Star
        className={`h-4 w-4 ${active ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
      />
    </button>
  );
});


export interface TestimonialsEditorProps {
  testimonials: CrmPageTestimonial[];
  setTestimonials: (t: CrmPageTestimonial[]) => void;
  showTrustSection: boolean;
  setShowTrustSection: (v: boolean) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function TestimonialsEditor({
  testimonials,
  setTestimonials,
  showTrustSection,
  setShowTrustSection,
  onSave,
  isSaving,
}: TestimonialsEditorProps) {
  const addTestimonial = useCallback(() => {
    setTestimonials([
      ...testimonials,
      { id: crypto.randomUUID(), name: "", text: "", rating: 5 },
    ]);
  }, [testimonials, setTestimonials]);

  const removeTestimonial = useCallback(
    (id: string) => {
      setTestimonials(testimonials.filter((t) => t.id !== id));
    },
    [testimonials, setTestimonials],
  );

  const updateTestimonial = useCallback(
    (id: string, field: keyof CrmPageTestimonial, value: string | number) => {
      setTestimonials(testimonials.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
    },
    [testimonials, setTestimonials],
  );

  return (
    <div className="max-w-2xl space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Trust &amp; Social Proof Section</CardTitle>
              <CardDescription>
                Show testimonials below the hero on your landing page.
              </CardDescription>
            </div>
            <Switch checked={showTrustSection} onCheckedChange={setShowTrustSection} />
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {testimonials.map((t) => (
          <TestimonialCard
            key={t.id}
            testimonial={t}
            onRemove={removeTestimonial}
            onUpdate={updateTestimonial}
          />
        ))}

        <Button variant="outline" size="sm" onClick={addTestimonial} className="gap-2 w-full">
          <Plus className="h-4 w-4" />
          Add Testimonial
        </Button>
      </div>

      <Button size="sm" onClick={onSave} disabled={isSaving} className="gap-2">
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save Testimonials
      </Button>
    </div>
  );
}

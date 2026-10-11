import { cn } from "@/lib/utils";
import { toneBar, type Tone } from "@/lib/design/tones";

interface ProgressBarProps {
  value: number;
  ariaLabel: string;
  stepText?: string;
  /** Bar color; defaults to the primary gold. */
  tone?: Tone;
}

export function ProgressBar({ value, ariaLabel, stepText, tone }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        {stepText && <span className="font-medium text-foreground">{stepText}</span>}
        <span className="text-muted-foreground">{clamped}% Completed</span>
      </div>
      <div
        className="h-1.5 bg-muted rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
        aria-valuetext={stepText ? `${stepText} — ${clamped}% completed` : `${clamped}% completed`}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-260 ease-out", tone ? toneBar[tone] : "bg-primary")}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

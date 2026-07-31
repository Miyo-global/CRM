interface ProgressBarProps {
  value: number;
  ariaLabel: string;
  stepText?: string;
}

export function ProgressBar({ value, ariaLabel, stepText }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        {stepText && <span className="font-medium text-foreground">{stepText}</span>}
        <span className="text-muted-foreground">{clamped}% Completed</span>
      </div>
      <div
        className="h-2 bg-muted rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
        aria-valuetext={stepText ? `${stepText} — ${clamped}% completed` : `${clamped}% completed`}
      >
        <div
          className="h-full gold-gradient rounded-full transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

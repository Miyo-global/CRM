"use client";

import { motion } from "framer-motion";

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface MiniDonutChartProps {
  data: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string | number;
}

export function MiniDonutChart({
  data,
  size = 180,
  strokeWidth = 28,
  centerLabel,
  centerValue,
}: MiniDonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulatedOffset = 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>

          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.06}
            strokeWidth={strokeWidth}
          />

          {data.map((segment, i) => {
            const pct = segment.value / total;
            const dashLength = pct * circumference;
            const dashGap = circumference - dashLength;
            const offset = -accumulatedOffset * circumference;
            accumulatedOffset += pct;

            return (
              <motion.circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLength} ${dashGap}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${center} ${center})`}
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{ strokeDasharray: `${dashLength} ${dashGap}` }}
                transition={{ duration: 0.8, delay: i * 0.15, ease: "easeOut" }}
              />
            );
          })}
        </svg>

        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue !== undefined && (
              <span className="text-2xl font-bold text-foreground">{centerValue}</span>
            )}
            {centerLabel && (
              <span className="text-xs text-muted-foreground">{centerLabel}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {data.map((segment, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-xs text-muted-foreground">
              {segment.label} ({segment.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

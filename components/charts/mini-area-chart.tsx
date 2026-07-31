"use client";

import { motion } from "framer-motion";

interface DataPoint {
  month: string;
  value: number;
}

interface MiniAreaChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
  formatValue?: (v: number) => string;
}

export function MiniAreaChart({
  data,
  color = "#3B82F6",
  height = 240,
  formatValue = (v) => v.toLocaleString(),
}: MiniAreaChartProps) {
  if (data.length === 0) return null;

  const paddingLeft = 50;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 28;
  const plotHeight = height - paddingTop - paddingBottom;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values) * 0.9;
  const maxVal = Math.max(...values) * 1.05;
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * (100 - paddingLeft - paddingRight);
    const y = paddingTop + ((maxVal - d.value) / range) * plotHeight;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + plotHeight} L ${points[0].x} ${paddingTop + plotHeight} Z`;

  const gradientId = `area-grad-${color.replace("#", "")}`;
  const yTicks = Array.from({ length: 4 }, (_, i) => {
    const val = minVal + (range * i) / 3;
    return { val, y: paddingTop + ((maxVal - val) / range) * plotHeight };
  });

  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>

      {yTicks.map((tick, i) => (
        <g key={i}>
          <line
            x1={paddingLeft}
            y1={tick.y}
            x2={100 - paddingRight}
            y2={tick.y}
            stroke="currentColor"
            strokeOpacity={0.07}
            strokeDasharray="2 2"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={paddingLeft - 4}
            y={tick.y + 1}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize="3"
            dominantBaseline="middle"
          >
            {formatValue(Math.round(tick.val))}
          </text>
        </g>
      ))}

      <motion.path
        d={areaPath}
        fill={`url(#${gradientId})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      />

      <motion.path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="0.6"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeInOut" }}
      />

      {points.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="1.2"
          fill={color}
          stroke="white"
          strokeWidth="0.4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.8 + i * 0.05 }}
        />
      ))}

      {points.map((p, i) => (
        <text
          key={`label-${i}`}
          x={p.x}
          y={height - 6}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="3"
        >
          {p.month}
        </text>
      ))}
    </svg>
  );
}

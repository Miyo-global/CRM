"use client";

import { memo } from "react";
import {
  BarChart,
  PieChart,
  AreaChart,
  ScatterChart,
  Bar,
  Pie,
  Area,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
} as const;

const CHART_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
];


interface StateEntry {
  state: string;
  count: number;
  fill: string;
}

interface StateDistributionChartProps {
  stateData: StateEntry[];
}

export const StateDistributionChart = memo(function StateDistributionChart({
  stateData,
}: StateDistributionChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">State Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {stateData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stateData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="state" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {stateData.map((entry) => (
                  <Cell key={entry.state} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
            No state data available
          </div>
        )}
      </CardContent>
    </Card>
  );
});


interface PriorityEntry {
  name: string;
  value: number;
  fill: string;
}

interface PriorityBreakdownChartProps {
  priorityData: PriorityEntry[];
}

export const PriorityBreakdownChart = memo(function PriorityBreakdownChart({
  priorityData,
}: PriorityBreakdownChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Priority Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {priorityData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={priorityData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
              >
                {priorityData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
            No priority data available
          </div>
        )}
      </CardContent>
    </Card>
  );
});


interface VolumeEntry {
  date: string;
  created: number;
}

interface VolumeOverTimeChartProps {
  volumeData: VolumeEntry[];
}

export const VolumeOverTimeChart = memo(function VolumeOverTimeChart({
  volumeData,
}: VolumeOverTimeChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Volume Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        {volumeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey="created"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.15}
                strokeWidth={2}
                name="Created"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
            No volume data available
          </div>
        )}
      </CardContent>
    </Card>
  );
});


interface AssigneeEntry {
  name: string;
  completed: number;
  total: number;
  rate: number;
}

const assigneeFormatter = (value: string | number) =>
  [`${value}%`, "Completion Rate"] as [string, string];

interface AssigneeCompletionChartProps {
  assigneeData: AssigneeEntry[];
}

export const AssigneeCompletionChart = memo(function AssigneeCompletionChart({
  assigneeData,
}: AssigneeCompletionChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Completion Rate by Assignee</CardTitle>
      </CardHeader>
      <CardContent>
        {assigneeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={assigneeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                domain={[0, 100]}
                unit="%"
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                width={100}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={assigneeFormatter as never}
              />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                {assigneeData.map((_entry, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
            No assignee data available
          </div>
        )}
      </CardContent>
    </Card>
  );
});


interface VelocityEntry {
  cycle: string;
  points: number;
}

interface CycleVelocityChartProps {
  velocityData: VelocityEntry[];
}

export const CycleVelocityChart = memo(function CycleVelocityChart({
  velocityData,
}: CycleVelocityChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cycle Velocity</CardTitle>
      </CardHeader>
      <CardContent>
        {velocityData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={velocityData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="cycle" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="points" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Completed Points" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
            No velocity data available
          </div>
        )}
      </CardContent>
    </Card>
  );
});


interface EstimateEntry {
  label: string;
  estimate: number;
  actual: number;
}

const estimateFormatter = (value: string | number, name: string) =>
  [value, name] as [string | number, string];

interface EstimateVsActualChartProps {
  estimateData: EstimateEntry[];
}

export const EstimateVsActualChart = memo(function EstimateVsActualChart({
  estimateData,
}: EstimateVsActualChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Estimate vs Actual</CardTitle>
      </CardHeader>
      <CardContent>
        {estimateData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="estimate"
                name="Estimate"
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                label={{
                  value: "Estimate",
                  position: "bottom",
                  className: "fill-muted-foreground",
                  fontSize: 12,
                }}
              />
              <YAxis
                dataKey="actual"
                name="Actual"
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                label={{
                  value: "Actual",
                  angle: -90,
                  position: "insideLeft",
                  className: "fill-muted-foreground",
                  fontSize: 12,
                }}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={estimateFormatter as never}
              />
              <Scatter data={estimateData} fill="#f43f5e" shape="circle">
                {estimateData.map((_entry, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
            No estimate data available
          </div>
        )}
      </CardContent>
    </Card>
  );
});

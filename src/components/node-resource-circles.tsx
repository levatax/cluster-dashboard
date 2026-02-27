"use client";

import { motion } from "motion/react";
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { Cpu, MemoryStick } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCpuMillicores, formatBytes } from "@/lib/format";
import type { NodeMetricsInfo } from "@/lib/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

function getColor(percent: number): string {
  if (percent >= 85) return "var(--color-destructive)";
  if (percent >= 70) return "var(--color-warning, hsl(38 92% 50%))";
  return "var(--color-success, hsl(142 76% 36%))";
}

function getTrackColor(percent: number): string {
  if (percent >= 85) return "color-mix(in oklch, var(--color-destructive) 15%, transparent)";
  if (percent >= 70) return "color-mix(in oklch, var(--color-warning, hsl(38 92% 50%)) 15%, transparent)";
  return "color-mix(in oklch, var(--color-success, hsl(142 76% 36%)) 15%, transparent)";
}

interface CircleGaugeProps {
  percent: number;
  label: string;
  subtitle?: string;
  icon: React.ReactNode;
  size?: number;
}

function CircleGauge({ percent, label, subtitle, icon, size = 110 }: CircleGaugeProps) {
  const color = getColor(percent);
  const trackColor = getTrackColor(percent);
  const data = [{ value: percent, fill: color }];

  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            barSize={12}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: trackColor }}
              dataKey="value"
              cornerRadius={6}
              angleAxisId={0}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-xl font-bold tabular-nums"
            style={{ color }}
          >
            {percent.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      {subtitle && (
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      )}
    </div>
  );
}

interface NodeResourceCirclesProps {
  metrics: NodeMetricsInfo[];
}

export function NodeResourceCircles({ metrics }: NodeResourceCirclesProps) {
  if (metrics.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Node Resource Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Metrics server is not available. Install metrics-server to see resource usage charts.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Node Resource Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={
            metrics.length === 1
              ? "grid grid-cols-1 gap-4"
              : metrics.length === 2
                ? "grid grid-cols-1 gap-4 sm:grid-cols-2"
                : metrics.length === 3
                  ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          }
        >
          {metrics.map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.05, ease }}
            >
              <Card className="h-full bg-muted/30">
                <CardContent className="p-6">
                  <h4 className="mb-4 truncate text-center font-medium" title={m.name}>
                    {m.name}
                  </h4>
                  <div className="flex items-start justify-center gap-4">
                    <CircleGauge
                      percent={m.cpuPercent}
                      label="CPU"
                      subtitle={`${formatCpuMillicores(m.cpuUsage)} / ${formatCpuMillicores(m.cpuCapacity)}`}
                      icon={<Cpu className="size-4" />}
                    />
                    <CircleGauge
                      percent={m.memoryPercent}
                      label="Memory"
                      subtitle={`${formatBytes(m.memoryUsage)} / ${formatBytes(m.memoryCapacity)}`}
                      icon={<MemoryStick className="size-4" />}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

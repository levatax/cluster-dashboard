"use client";

import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface ResourceGaugeChartProps {
  title: string;
  value: number | null;
  icon: LucideIcon;
  subtitle?: string;
}

function getGaugeColor(value: number | null): string {
  if (value == null) return "hsl(var(--muted-foreground))";
  if (value >= 85) return "hsl(0 84% 60%)"; // red
  if (value >= 70) return "hsl(38 92% 50%)"; // amber
  return "hsl(142 76% 36%)"; // green
}

function getGaugeTrackColor(value: number | null): string {
  if (value == null) return "hsl(var(--muted))";
  if (value >= 85) return "hsl(0 84% 60% / 0.15)";
  if (value >= 70) return "hsl(38 92% 50% / 0.15)";
  return "hsl(142 76% 36% / 0.15)";
}

export function ResourceGaugeChart({
  title,
  value,
  icon: Icon,
  subtitle,
}: ResourceGaugeChartProps) {
  const displayValue = value ?? 0;
  const data = [{ value: displayValue, fill: getGaugeColor(value) }];

  return (
    <Card className="relative overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: getGaugeColor(value) }}
      />
      <CardHeader className="pb-0">
        <div className="flex items-center gap-2">
          <div
            className="flex size-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: getGaugeTrackColor(value) }}
          >
            <Icon className="size-4" style={{ color: getGaugeColor(value) }} />
          </div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4">
          <div className="relative size-28 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="70%"
                outerRadius="100%"
                barSize={10}
                data={data}
                startAngle={180}
                endAngle={0}
              >
                <PolarAngleAxis
                  type="number"
                  domain={[0, 100]}
                  angleAxisId={0}
                  tick={false}
                />
                <RadialBar
                  background={{ fill: getGaugeTrackColor(value) }}
                  dataKey="value"
                  cornerRadius={5}
                  angleAxisId={0}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
              <span
                className="text-2xl font-bold tabular-nums"
                style={{ color: value != null ? getGaugeColor(value) : undefined }}
              >
                {value != null ? `${value.toFixed(0)}%` : "N/A"}
              </span>
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <div className="text-xs text-muted-foreground">
              {value != null ? (
                value >= 85 ? (
                  <span className="font-medium text-red-600 dark:text-red-400">
                    Critical - Consider scaling
                  </span>
                ) : value >= 70 ? (
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    Warning - Monitor closely
                  </span>
                ) : (
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    Healthy
                  </span>
                )
              ) : (
                <span>Metrics unavailable</span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

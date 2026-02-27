"use client";

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NodeMetricsInfo } from "@/lib/types";

const chartConfig = {
  cpu: {
    label: "CPU %",
    color: "var(--chart-1)",
  },
  memory: {
    label: "Memory %",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

interface NodeMetricsChartProps {
  metrics: NodeMetricsInfo[];
}

export function NodeMetricsChart({ metrics }: NodeMetricsChartProps) {
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

  const data = metrics.map((m) => ({
    name: m.name,
    cpu: Math.round(m.cpuPercent * 10) / 10,
    memory: Math.round(m.memoryPercent * 10) / 10,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Node Resource Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} unit="%" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReferenceLine y={85} stroke="var(--destructive)" strokeDasharray="3 3" label={{ value: "Critical", position: "right", fontSize: 10 }} />
            <ReferenceLine y={70} stroke="var(--chart-4)" strokeDasharray="3 3" label={{ value: "Warning", position: "right", fontSize: 10 }} />
            <Bar dataKey="cpu" fill="var(--color-cpu)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="memory" fill="var(--color-memory)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

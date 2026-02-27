"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/motion-primitives";
import type { ClusterInfo, NodeInfo, ClusterHealthSummary } from "@/lib/types";

interface ComparisonCluster {
  id: string;
  name: string;
  server: string;
  info: (ClusterInfo & { connected: boolean }) | null;
  health: ClusterHealthSummary | null;
  nodes: NodeInfo[];
}

interface ClusterCompareProps {
  data: ComparisonCluster[];
}

function MetricRow({
  label,
  values,
  higherIsBetter = true,
}: {
  label: string;
  values: (number | null)[];
  higherIsBetter?: boolean;
}) {
  const numericValues = values.filter((v): v is number => v !== null);
  const best = numericValues.length > 0
    ? (higherIsBetter ? Math.max(...numericValues) : Math.min(...numericValues))
    : null;

  return (
    <div className="grid items-center gap-4 border-b border-border/50 py-3 last:border-0" style={{ gridTemplateColumns: `140px repeat(${values.length}, minmax(100px, 1fr))` }}>
      <span className="text-sm text-muted-foreground">{label}</span>
      {values.map((val, i) => {
        const isBest = val !== null && val === best && numericValues.length > 1;
        return (
          <span
            key={i}
            className={`text-sm font-medium tabular-nums ${
              isBest ? "text-emerald-600 dark:text-emerald-400" : ""
            }`}
          >
            {val !== null ? val : "N/A"}
          </span>
        );
      })}
    </div>
  );
}

function PercentRow({
  label,
  values,
}: {
  label: string;
  values: (number | null)[];
}) {
  const numericValues = values.filter((v): v is number => v !== null);
  const best = numericValues.length > 0 ? Math.min(...numericValues) : null;

  return (
    <div className="grid items-center gap-4 border-b border-border/50 py-3 last:border-0" style={{ gridTemplateColumns: `140px repeat(${values.length}, minmax(100px, 1fr))` }}>
      <span className="text-sm text-muted-foreground">{label}</span>
      {values.map((val, i) => {
        const isBest = val !== null && val === best && numericValues.length > 1;
        const color = val === null
          ? ""
          : val < 70
            ? "text-emerald-600 dark:text-emerald-400"
            : val < 85
              ? "text-yellow-600 dark:text-yellow-400"
              : "text-red-600 dark:text-red-400";
        return (
          <div key={i} className="flex items-center gap-2">
            <div className="bg-secondary h-2 w-16 overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full transition-all ${
                  val === null
                    ? "bg-muted"
                    : val < 70
                      ? "bg-emerald-500"
                      : val < 85
                        ? "bg-yellow-500"
                        : "bg-red-500"
                }`}
                style={{ width: `${Math.min(100, val ?? 0)}%` }}
              />
            </div>
            <span className={`text-sm font-medium tabular-nums ${isBest ? "font-bold" : ""} ${color}`}>
              {val !== null ? `${val.toFixed(1)}%` : "N/A"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ClusterCompare({ data }: ClusterCompareProps) {
  return (
    <div className="space-y-6 overflow-x-auto">
      <FadeIn delay={0.05}>
        <Button variant="outline" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="mr-1 size-3.5" />
            Back to Clusters
          </Link>
        </Button>
      </FadeIn>

      {/* Cluster header cards */}
      <FadeIn delay={0.1}>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(180px, 1fr))` }}>
          {data.map((cluster) => (
            <Card key={cluster.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Server className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">
                      <Link href={`/clusters/${cluster.id}`} className="hover:underline">
                        {cluster.name}
                      </Link>
                    </CardTitle>
                    <p className="truncate text-xs text-muted-foreground">{cluster.server}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {cluster.info?.connected ? (
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="mr-1 size-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400">
                    <XCircle className="mr-1 size-3" />
                    Disconnected
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </FadeIn>

      {/* Comparison sections */}
      <FadeIn delay={0.15}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cluster Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid items-center gap-4 border-b border-border/50 py-3" style={{ gridTemplateColumns: `140px repeat(${data.length}, minmax(100px, 1fr))` }}>
              <span className="text-sm text-muted-foreground">K8s Version</span>
              {data.map((c) => (
                <span key={c.id} className="text-sm font-medium">
                  {c.info?.version ?? "N/A"}
                </span>
              ))}
            </div>
            <MetricRow
              label="Node Count"
              values={data.map((c) => c.info?.nodeCount ?? null)}
            />
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.2}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Node Health</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricRow
              label="Nodes Ready"
              values={data.map((c) => c.health?.nodesReady ?? null)}
            />
            <MetricRow
              label="Nodes Total"
              values={data.map((c) => c.health?.nodesTotal ?? null)}
            />
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.25}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workloads</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricRow
              label="Pods Running"
              values={data.map((c) => c.health?.podsRunning ?? null)}
            />
            <MetricRow
              label="Pods Pending"
              values={data.map((c) => c.health?.podsPending ?? null)}
              higherIsBetter={false}
            />
            <MetricRow
              label="Pods Failed"
              values={data.map((c) => c.health?.podsFailed ?? null)}
              higherIsBetter={false}
            />
            <MetricRow
              label="Pods Total"
              values={data.map((c) => c.health?.podsTotal ?? null)}
            />
            <MetricRow
              label="Deployments Healthy"
              values={data.map((c) => c.health?.deploymentsHealthy ?? null)}
            />
            <MetricRow
              label="Deployments Total"
              values={data.map((c) => c.health?.deploymentsTotal ?? null)}
            />
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.3}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resource Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <PercentRow
              label="CPU Avg"
              values={data.map((c) => c.health?.cpuAvgPercent ?? null)}
            />
            <PercentRow
              label="Memory Avg"
              values={data.map((c) => c.health?.memoryAvgPercent ?? null)}
            />
            <MetricRow
              label="Warning Events"
              values={data.map((c) => c.health?.warningEvents ?? null)}
              higherIsBetter={false}
            />
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}

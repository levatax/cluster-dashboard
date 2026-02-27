"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClusterStatusBadge } from "@/components/cluster-status-badge";
import { ResourceGaugeChart } from "@/components/resource-gauge-chart";
import { StaggerGrid, StaggerItem, FadeIn } from "@/components/motion-primitives";
import {
  Globe,
  Tag,
  GitBranch,
  Layers,
  Server,
  Calendar,
  Clock,
  Cpu,
  MemoryStick,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import type { ClusterInfo, ClusterHealthSummary } from "@/lib/types";
import type { Cluster } from "@/lib/db";

interface ClusterOverviewProps {
  info: ClusterInfo & { connected: boolean };
  cluster: Omit<Cluster, "kubeconfig_yaml">;
  health?: ClusterHealthSummary;
}

function HealthStatusCard({
  title,
  value,
  total,
  icon: Icon,
  status,
  subtitle,
}: {
  title: string;
  value: number;
  total: number;
  icon: React.ElementType;
  status: "healthy" | "warning" | "critical";
  subtitle: string;
}) {
  const statusColors = {
    healthy: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-600 dark:text-emerald-400",
      icon: CheckCircle2,
    },
    warning: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-600 dark:text-amber-400",
      icon: AlertTriangle,
    },
    critical: {
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      text: "text-red-600 dark:text-red-400",
      icon: XCircle,
    },
  };

  const colors = statusColors[status];
  const StatusIcon = colors.icon;
  const percent = total > 0 ? (value / total) * 100 : 0;

  return (
    <Card className={`relative overflow-hidden border ${colors.border}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex size-8 items-center justify-center rounded-lg ${colors.bg}`}>
              <Icon className={`size-4 ${colors.text}`} />
            </div>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          <StatusIcon className={`size-4 ${colors.text}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tabular-nums">{value}</span>
          <span className="text-lg text-muted-foreground">/ {total}</span>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full transition-all ${
                status === "healthy"
                  ? "bg-emerald-500"
                  : status === "warning"
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${Math.min(100, percent)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickStatCard({
  title,
  value,
  icon: Icon,
  status,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  status?: "healthy" | "warning" | "critical" | "neutral";
}) {
  const statusStyles = {
    healthy: "border-emerald-500/30 bg-emerald-500/5",
    warning: "border-amber-500/30 bg-amber-500/5",
    critical: "border-red-500/30 bg-red-500/5",
    neutral: "border-border",
  };

  const iconStyles = {
    healthy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    critical: "bg-red-500/10 text-red-600 dark:text-red-400",
    neutral: "bg-primary/10 text-primary",
  };

  return (
    <div className={`rounded-lg border p-3 ${statusStyles[status ?? "neutral"]}`}>
      <div className="flex items-center gap-3">
        <div className={`flex size-9 items-center justify-center rounded-lg ${iconStyles[status ?? "neutral"]}`}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="truncate font-semibold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium ${mono ? "font-mono break-all" : ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

export function ClusterOverview({ info, cluster, health }: ClusterOverviewProps) {
  const nodesHealthy = health ? health.nodesReady === health.nodesTotal : true;
  const deploymentsHealthy = health ? health.deploymentsHealthy === health.deploymentsTotal : true;
  const hasWarnings = health ? health.warningEvents > 0 : false;
  const hasCriticalPods = health ? health.podsFailed > 0 : false;

  return (
    <div className="space-y-6">
      {/* Section 1: Resource Usage Charts */}
      {health?.metricsAvailable && (
        <FadeIn>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-primary/10">
                <Cpu className="size-3.5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold">Resource Usage</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <ResourceGaugeChart
                title="Average CPU"
                value={health.cpuAvgPercent}
                icon={Cpu}
                subtitle="Across all nodes"
              />
              <ResourceGaugeChart
                title="Average Memory"
                value={health.memoryAvgPercent}
                icon={MemoryStick}
                subtitle="Across all nodes"
              />
            </div>
          </div>
        </FadeIn>
      )}

      {!health?.metricsAvailable && (
        <FadeIn>
          <Card className="border-dashed">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                <Info className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Resource Metrics Unavailable</p>
                <p className="text-sm text-muted-foreground">
                  Install metrics-server to view CPU and Memory usage charts
                </p>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Section 2: Health Status */}
      {health && (
        <FadeIn delay={0.05}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-primary/10">
                <CheckCircle2 className="size-3.5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold">Health Status</h3>
            </div>
            <StaggerGrid className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StaggerItem>
                <HealthStatusCard
                  title="Nodes"
                  value={health.nodesReady}
                  total={health.nodesTotal}
                  icon={Server}
                  status={nodesHealthy ? "healthy" : "critical"}
                  subtitle={nodesHealthy ? "All nodes ready" : "Some nodes unhealthy"}
                />
              </StaggerItem>
              <StaggerItem>
                <HealthStatusCard
                  title="Deployments"
                  value={health.deploymentsHealthy}
                  total={health.deploymentsTotal}
                  icon={Layers}
                  status={deploymentsHealthy ? "healthy" : "warning"}
                  subtitle={deploymentsHealthy ? "All deployments healthy" : "Some need attention"}
                />
              </StaggerItem>
              <StaggerItem>
                <Card className={`relative overflow-hidden border ${hasWarnings ? "border-amber-500/30" : "border-border"}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`flex size-8 items-center justify-center rounded-lg ${hasWarnings ? "bg-amber-500/10" : "bg-muted"}`}>
                          <AlertTriangle className={`size-4 ${hasWarnings ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`} />
                        </div>
                        <CardTitle className="text-sm font-medium">Warnings</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-bold tabular-nums ${hasWarnings ? "text-amber-600 dark:text-amber-400" : ""}`}>
                        {health.warningEvents}
                      </span>
                      <span className="text-sm text-muted-foreground">events</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {hasWarnings ? "Check monitoring tab for details" : "No active warnings"}
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
              <StaggerItem>
                <Card className="relative overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                        <Boxes className="size-4 text-primary" />
                      </div>
                      <CardTitle className="text-sm font-medium">Pods</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        {health.podsRunning} running
                      </Badge>
                      {health.podsPending > 0 && (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                          {health.podsPending} pending
                        </Badge>
                      )}
                      {health.podsFailed > 0 && (
                        <Badge variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-400">
                          {health.podsFailed} failed
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {health.podsTotal} total pods across cluster
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
            </StaggerGrid>
          </div>
        </FadeIn>
      )}

      {/* Section 3: Quick Stats Row */}
      <FadeIn delay={0.1}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickStatCard
            title="Connection"
            value={info.connected ? "Connected" : "Disconnected"}
            icon={info.connected ? CheckCircle2 : XCircle}
            status={info.connected ? "healthy" : "critical"}
          />
          <QuickStatCard
            title="Kubernetes"
            value={info.version || "Unknown"}
            icon={Layers}
          />
          <QuickStatCard
            title="Nodes"
            value={info.nodeCount}
            icon={Server}
          />
          <QuickStatCard
            title="Context"
            value={info.context || "-"}
            icon={GitBranch}
          />
        </div>
      </FadeIn>

      {/* Section 4: Cluster Details */}
      <FadeIn delay={0.15}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-primary/10">
                <Tag className="size-3.5 text-primary" />
              </div>
              <CardTitle className="text-sm font-semibold">Cluster Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
              <InfoRow icon={Tag} label="Cluster Name" value={info.name || cluster.name} />
              <InfoRow icon={Globe} label="Server" value={info.server || cluster.server} mono />
              <InfoRow icon={GitBranch} label="Context" value={info.context || "-"} />
              <InfoRow icon={Layers} label="Kubernetes Version" value={info.version} />
              <InfoRow
                icon={Calendar}
                label="Imported"
                value={new Date(cluster.created_at).toLocaleString()}
              />
              <InfoRow
                icon={Clock}
                label="Last Connected"
                value={
                  cluster.last_connected_at
                    ? new Date(cluster.last_connected_at).toLocaleString()
                    : "Never"
                }
              />
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}

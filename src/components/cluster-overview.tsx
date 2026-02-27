"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { ClusterMeta } from "@/lib/db";

interface ClusterOverviewProps {
  info: ClusterInfo & { connected: boolean };
  cluster: ClusterMeta;
  health?: ClusterHealthSummary;
  onNavigate?: (section: "nodes" | "deployments" | "monitoring" | "pods", filter?: "Warning") => void;
}

function HealthCard({
  title,
  icon: Icon,
  status,
  value,
  label,
  onClick,
}: {
  title: string;
  icon: React.ElementType;
  status: "healthy" | "warning" | "critical" | "neutral";
  value: string;
  label: string;
  onClick?: () => void;
}) {
  const styles = {
    healthy: {
      border: "border-emerald-500/25",
      iconBg: "bg-emerald-500/10",
      iconText: "text-emerald-600 dark:text-emerald-400",
      StatusIcon: CheckCircle2,
      statusText: "text-emerald-500",
    },
    warning: {
      border: "border-amber-500/25",
      iconBg: "bg-amber-500/10",
      iconText: "text-amber-600 dark:text-amber-400",
      StatusIcon: AlertTriangle,
      statusText: "text-amber-500",
    },
    critical: {
      border: "border-red-500/25",
      iconBg: "bg-red-500/10",
      iconText: "text-red-600 dark:text-red-400",
      StatusIcon: XCircle,
      statusText: "text-red-500",
    },
    neutral: {
      border: "border-border",
      iconBg: "bg-muted",
      iconText: "text-muted-foreground",
      StatusIcon: null,
      statusText: "",
    },
  };

  const s = styles[status];
  const StatusIcon = s.StatusIcon;

  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      className={`flex w-full items-center gap-3 rounded-lg border p-3.5 text-left ${s.border} ${onClick ? "cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : ""}`}
      onClick={onClick}
    >
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${s.iconBg}`}>
        <Icon className={`size-4 ${s.iconText}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="truncate text-sm font-semibold tabular-nums leading-snug">{value}</p>
        <p className="truncate text-xs text-muted-foreground leading-snug">{label}</p>
      </div>
      {StatusIcon && <StatusIcon className={`size-4 shrink-0 ${s.statusText}`} />}
    </Comp>
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

export function ClusterOverview({ info, cluster, health, onNavigate }: ClusterOverviewProps) {
  const nodesHealthy = health ? health.nodesReady === health.nodesTotal : true;
  const deploymentsHealthy = health ? health.deploymentsHealthy === health.deploymentsTotal : true;
  const hasWarnings = health ? health.warningEvents > 0 : false;
  const hasCriticalPods = health ? health.podsFailed > 0 : false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold">Overview</h2>
        <p className="text-sm text-muted-foreground">Cluster health, resource usage, and status at a glance</p>
      </div>

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
            <StaggerGrid className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StaggerItem>
                <HealthCard
                  title="Nodes"
                  icon={Server}
                  status={nodesHealthy ? "healthy" : "critical"}
                  value={`${health.nodesReady} / ${health.nodesTotal} ready`}
                  label={nodesHealthy ? "All nodes healthy" : "Some nodes unhealthy"}
                  onClick={onNavigate ? () => onNavigate("nodes") : undefined}
                />
              </StaggerItem>
              <StaggerItem>
                <HealthCard
                  title="Deployments"
                  icon={Layers}
                  status={deploymentsHealthy ? "healthy" : "warning"}
                  value={`${health.deploymentsHealthy} / ${health.deploymentsTotal} healthy`}
                  label={deploymentsHealthy ? "All deployments ready" : "Some need attention"}
                  onClick={onNavigate ? () => onNavigate("deployments") : undefined}
                />
              </StaggerItem>
              <StaggerItem>
                <HealthCard
                  title="Warnings"
                  icon={AlertTriangle}
                  status={hasWarnings ? "warning" : "neutral"}
                  value={`${health.warningEvents} event${health.warningEvents !== 1 ? "s" : ""}`}
                  label={hasWarnings ? "Check monitoring tab" : "No active warnings"}
                  onClick={onNavigate ? () => onNavigate("monitoring", "Warning") : undefined}
                />
              </StaggerItem>
              <StaggerItem>
                <HealthCard
                  title="Pods"
                  icon={Boxes}
                  status={hasCriticalPods ? "critical" : health.podsPending > 0 ? "warning" : "healthy"}
                  value={`${health.podsRunning} / ${health.podsTotal} running`}
                  label={
                    hasCriticalPods
                      ? `${health.podsFailed} failed · ${health.podsPending} pending`
                      : health.podsPending > 0
                        ? `${health.podsPending} pending`
                        : "All pods running"
                  }
                  onClick={onNavigate ? () => onNavigate("pods") : undefined}
                />
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

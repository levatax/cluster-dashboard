"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, AlertCircle, Cpu, MemoryStick, Server } from "lucide-react";
import type { ActiveAlert } from "@/hooks/use-alert-evaluation";

interface AlertDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: ActiveAlert | null;
}

export function AlertDetailSheet({ open, onOpenChange, alert }: AlertDetailSheetProps) {
  if (!alert) return null;

  const isCritical = alert.level === "critical";
  const Icon = isCritical ? AlertCircle : AlertTriangle;
  const MetricIcon = alert.metric === "CPU" ? Cpu : MemoryStick;
  const severityText = isCritical ? "Critical" : "Warning";
  const recommendation = getRecommendation(alert);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Icon
              className={`size-5 ${isCritical ? "text-red-500" : "text-yellow-500"}`}
            />
            {alert.metric} Alert
          </SheetTitle>
          <SheetDescription>
            Detailed information about this alert
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Severity Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Severity</span>
            <Badge
              variant="outline"
              className={
                isCritical
                  ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
                  : "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
              }
            >
              {severityText}
            </Badge>
          </div>

          {/* Node */}
          {alert.node && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Node</span>
              <div className="flex items-center gap-1.5">
                <Server className="size-3.5 text-muted-foreground" />
                <span className="font-mono text-sm">{alert.node}</span>
              </div>
            </div>
          )}

          {/* Metric */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Metric</span>
            <div className="flex items-center gap-1.5">
              <MetricIcon className="size-3.5 text-muted-foreground" />
              <span className="text-sm">{alert.metric}</span>
            </div>
          </div>

          {/* Current Value with Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Usage</span>
              <span className="text-lg font-semibold">{alert.value.toFixed(1)}%</span>
            </div>
            <Progress
              value={alert.value}
              className={`h-3 ${isCritical ? "[&>[data-slot=progress-indicator]]:bg-red-500" : "[&>[data-slot=progress-indicator]]:bg-yellow-500"}`}
            />
          </div>

          {/* Threshold */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Threshold</span>
            <span className="text-sm font-medium">{alert.threshold}%</span>
          </div>

          {/* Exceeded By */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Exceeded By</span>
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              +{(alert.value - alert.threshold).toFixed(1)}%
            </span>
          </div>

          {/* Recommendation */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <h4 className="text-sm font-medium">Recommendation</h4>
            <p className="text-sm text-muted-foreground">{recommendation}</p>
          </div>

          {/* Possible Actions */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Possible Actions</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              {getActions(alert).map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function getRecommendation(alert: ActiveAlert): string {
  const isCritical = alert.level === "critical";

  if (alert.metric === "CPU") {
    return isCritical
      ? "CPU usage is critically high. Immediate action recommended to prevent service degradation or node instability."
      : "CPU usage is elevated. Monitor closely and consider scaling or optimizing workloads.";
  }

  return isCritical
    ? "Memory usage is critically high. Risk of OOM kills. Consider scaling or reducing memory-intensive workloads."
    : "Memory usage is elevated. Monitor for potential memory pressure issues.";
}

function getActions(alert: ActiveAlert): string[] {
  if (alert.metric === "CPU") {
    return [
      "Scale up the node or add more nodes to the cluster",
      "Identify and optimize CPU-intensive pods",
      "Set resource limits on deployments",
      "Consider horizontal pod autoscaling (HPA)",
    ];
  }

  return [
    "Scale up node memory or add more nodes",
    "Identify memory-leaking applications",
    "Adjust memory requests and limits",
    "Consider vertical pod autoscaling (VPA)",
  ];
}

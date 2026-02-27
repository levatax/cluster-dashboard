"use client";

import { useMemo } from "react";
import type { NodeMetricsInfo } from "@/lib/types";
import type { AlertConfig } from "@/lib/db";

export interface ActiveAlert {
  metric: string;
  level: "warning" | "critical";
  value: number;
  threshold: number;
  node?: string;
}

export function useAlertEvaluation(
  metrics: NodeMetricsInfo[],
  alertConfigs: AlertConfig[]
): ActiveAlert[] {
  return useMemo(() => {
    if (metrics.length === 0 || alertConfigs.length === 0) return [];

    const alerts: ActiveAlert[] = [];

    const cpuConfig = alertConfigs.find((c) => c.metric === "cpu" && c.enabled);
    const memConfig = alertConfigs.find((c) => c.metric === "memory" && c.enabled);

    for (const node of metrics) {
      if (cpuConfig) {
        if (node.cpuPercent >= cpuConfig.critical_threshold) {
          alerts.push({
            metric: "CPU",
            level: "critical",
            value: node.cpuPercent,
            threshold: cpuConfig.critical_threshold,
            node: node.name,
          });
        } else if (node.cpuPercent >= cpuConfig.warning_threshold) {
          alerts.push({
            metric: "CPU",
            level: "warning",
            value: node.cpuPercent,
            threshold: cpuConfig.warning_threshold,
            node: node.name,
          });
        }
      }

      if (memConfig) {
        if (node.memoryPercent >= memConfig.critical_threshold) {
          alerts.push({
            metric: "Memory",
            level: "critical",
            value: node.memoryPercent,
            threshold: memConfig.critical_threshold,
            node: node.name,
          });
        } else if (node.memoryPercent >= memConfig.warning_threshold) {
          alerts.push({
            metric: "Memory",
            level: "warning",
            value: node.memoryPercent,
            threshold: memConfig.warning_threshold,
            node: node.name,
          });
        }
      }
    }

    return alerts;
  }, [metrics, alertConfigs]);
}

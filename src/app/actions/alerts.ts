"use server";

import { getAlertConfigs, upsertAlertConfig, type AlertConfig } from "@/lib/db";

export async function fetchAlertConfigs(
  clusterId: string
): Promise<{ success: true; data: AlertConfig[] } | { success: false; error: string }> {
  try {
    const configs = await getAlertConfigs(clusterId);
    return { success: true, data: configs };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch alert configs";
    return { success: false, error: message };
  }
}

export async function updateAlertConfig(
  clusterId: string,
  metric: string,
  warningThreshold: number,
  criticalThreshold: number,
  enabled: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await upsertAlertConfig(clusterId, metric, warningThreshold, criticalThreshold, enabled);
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update alert config";
    return { success: false, error: message };
  }
}

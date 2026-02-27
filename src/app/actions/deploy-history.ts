"use server";

import { getDeploymentHistory, type DeploymentHistoryRow } from "@/lib/db";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export async function fetchDeploymentHistory(
  clusterId: string,
  limit = 100
): Promise<ActionResult<DeploymentHistoryRow[]>> {
  try {
    const history = await getDeploymentHistory(clusterId, limit);
    return { success: true, data: history };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to fetch history" };
  }
}

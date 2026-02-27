"use server";

import {
  insertDeploymentTemplate,
  getDeploymentTemplatesByType,
  deleteDeploymentTemplate,
  type DeploymentTemplateRow,
} from "@/lib/db";
import { requireSession } from "@/lib/auth";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export interface DeploymentTemplateConfig {
  name: string;
  namespace: string;
  image: string;
  port: number;
  replicas: number;
  ingressEnabled: boolean;
  ingressHost: string;
  envVars: { key: string; value: string; isSecret: boolean }[];
  repoUrl?: string;
  branch?: string;
}

export async function saveDeploymentTemplate(
  name: string,
  description: string | null,
  sourceType: "github" | "app_catalog",
  config: DeploymentTemplateConfig,
  catalogAppId?: string
): Promise<ActionResult<DeploymentTemplateRow>> {
  try {
    await requireSession();
    if (!name.trim()) {
      return { success: false, error: "Template name is required" };
    }

    const template = await insertDeploymentTemplate(
      name.trim(),
      description?.trim() || null,
      sourceType,
      config as unknown as Record<string, unknown>,
      catalogAppId
    );

    return { success: true, data: template };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to save template" };
  }
}

export async function fetchTemplatesByType(
  sourceType: "github" | "app_catalog"
): Promise<ActionResult<DeploymentTemplateRow[]>> {
  try {
    await requireSession();
    const templates = await getDeploymentTemplatesByType(sourceType);
    return { success: true, data: templates };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to fetch templates" };
  }
}

export async function removeTemplate(id: string): Promise<ActionResult<void>> {
  try {
    await requireSession();
    await deleteDeploymentTemplate(id);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to remove template" };
  }
}

"use server";

import yaml from "js-yaml";
import { getClusterById, insertDeploymentHistory } from "@/lib/db";
import { applyResourceYaml } from "@/lib/kubernetes";
import { getTemplate, getAllTemplates } from "@/lib/templates/index";
import type { ResourceTemplate } from "@/lib/templates/types";
import type * as k8s from "@kubernetes/client-node";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export async function fetchTemplates(): Promise<ActionResult<Omit<ResourceTemplate, "generateYaml">[]>> {
  try {
    const templates = getAllTemplates();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const serializable = templates.map(({ generateYaml: _gen, ...rest }) => rest);
    return { success: true, data: serializable };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to fetch templates" };
  }
}

export async function createFromTemplate(
  clusterId: string,
  templateId: string,
  values: Record<string, unknown>
): Promise<ActionResult<void>> {
  try {
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };

    const template = getTemplate(templateId);
    if (!template) return { success: false, error: `Template "${templateId}" not found` };

    const yamlStr = template.generateYaml(values);
    const docs = yaml.loadAll(yamlStr) as k8s.KubernetesObject[];

    for (const doc of docs) {
      if (doc && typeof doc === "object") {
        await applyResourceYaml(cluster.kubeconfig_yaml, doc);
      }
    }

    const name = (values.name as string) || templateId;
    const namespace = (values.namespace as string) || "default";
    await insertDeploymentHistory(clusterId, "template", null, "create", name, namespace, "deployed", {
      templateId,
      kind: template.kind,
    });

    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to create resource" };
  }
}

export async function previewTemplate(
  templateId: string,
  values: Record<string, unknown>
): Promise<ActionResult<string>> {
  try {
    const template = getTemplate(templateId);
    if (!template) return { success: false, error: `Template "${templateId}" not found` };
    const yamlStr = template.generateYaml(values);
    return { success: true, data: yamlStr };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to generate preview" };
  }
}

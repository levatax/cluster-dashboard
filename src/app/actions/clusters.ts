"use server";

import { revalidatePath } from "next/cache";
import yaml from "js-yaml";
import { insertCluster, deleteCluster } from "@/lib/db";

interface KubeConfigData {
  clusters?: Array<{
    name: string;
    cluster: { server: string };
  }>;
  contexts?: Array<{
    name: string;
    context: { cluster: string };
  }>;
  "current-context"?: string;
}

export async function importCluster(formData: FormData) {
  try {
    const kubeconfigYaml = formData.get("kubeconfig") as string;
    if (!kubeconfigYaml?.trim()) {
      return { success: false, error: "Kubeconfig YAML is required" };
    }

    let parsed: KubeConfigData;
    try {
      parsed = yaml.load(kubeconfigYaml) as KubeConfigData;
    } catch {
      return { success: false, error: "Invalid YAML format" };
    }

    if (!parsed?.clusters?.length) {
      return { success: false, error: "No clusters found in kubeconfig" };
    }

    const currentContext = parsed["current-context"];
    const contextObj = parsed.contexts?.find((c) => c.name === currentContext);
    const clusterName =
      contextObj?.context?.cluster || parsed.clusters[0].name;
    const clusterObj = parsed.clusters.find((c) => c.name === clusterName);
    const server = clusterObj?.cluster?.server || parsed.clusters[0].cluster.server;
    const name = clusterName || "unnamed-cluster";

    const cluster = await insertCluster(name, server, kubeconfigYaml);

    revalidatePath("/");
    return { success: true, data: cluster };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to import cluster";
    return { success: false, error: message };
  }
}

export async function removeCluster(id: string) {
  try {
    await deleteCluster(id);
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete cluster";
    return { success: false, error: message };
  }
}

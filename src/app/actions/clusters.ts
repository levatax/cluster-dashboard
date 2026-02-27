"use server";

import { revalidatePath } from "next/cache";
import yaml from "js-yaml";
import { insertCluster, deleteCluster } from "@/lib/db";
import { checkConnection, getClusterInfo } from "@/lib/kubernetes";
import { requireSession } from "@/lib/auth";

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
    await requireSession();
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

export async function testKubeconfigConnection(kubeconfigYaml: string) {
  try {
    await requireSession();
    if (!kubeconfigYaml?.trim()) {
      return { success: false as const, error: "Kubeconfig YAML is required" };
    }

    let parsed: KubeConfigData;
    try {
      parsed = yaml.load(kubeconfigYaml) as KubeConfigData;
    } catch {
      return { success: false as const, error: "Invalid YAML format" };
    }

    if (!parsed?.clusters?.length) {
      return { success: false as const, error: "No clusters found in kubeconfig" };
    }

    const connStatus = await checkConnection(kubeconfigYaml);
    if (connStatus !== "connected") {
      const messages: Record<string, string> = {
        parse_error: "Invalid kubeconfig format",
        auth_error: "Authentication failed — check credentials",
        network_error: "Could not reach the cluster — check network/server address",
        unknown_error: "Could not connect to the cluster",
      };
      return { success: false as const, error: messages[connStatus] };
    }

    const info = await getClusterInfo(kubeconfigYaml);
    return {
      success: true as const,
      data: { version: info.version, nodeCount: info.nodeCount },
    };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Connection test failed";
    return { success: false as const, error: message };
  }
}

export async function removeCluster(id: string) {
  try {
    await requireSession();
    await deleteCluster(id);
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete cluster";
    return { success: false, error: message };
  }
}

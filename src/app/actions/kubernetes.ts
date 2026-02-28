"use server";

import { getClusterById, updateLastConnected, getClusterRegistryUrl, setClusterRegistryUrl } from "@/lib/db";
import {
  getClusterInfo,
  getNodes,
  getNamespaces,
  getPods,
  getPodsByLabelSelector,
  getDeployments,
  getServices,
  getIngresses,
  getIngressClasses,
  checkConnection,
  getNodeMetrics,
  getPodMetrics,
  getEvents,
  getClusterHealthSummary,
  getPodLogSnapshot,
  cordonNode,
  uncordonNode,
  drainNode,
  scaleDeployment,
  getResourceYaml,
  applyResourceYaml,
  deleteResource,
  createNamespace,
  getPersistentVolumes,
  getPersistentVolumeClaims,
  getStorageClasses,
  getConfigMaps,
  getSecrets,
  type ClusterInfo,
  type NodeInfo,
  type PodInfo,
  type DeploymentInfo,
  type ServiceInfo,
  type IngressInfo,
  type IngressClassInfo,
  type NodeMetricsInfo,
  type PodMetricsInfo,
  type ClusterEventInfo,
  type ClusterHealthSummary,
  type PersistentVolumeInfo,
  type PersistentVolumeClaimInfo,
  type StorageClassInfo,
  type ConfigMapInfo,
  type SecretInfo,
} from "@/lib/kubernetes";
import { discoverApplications } from "@/lib/applications";
import { helmList, helmUninstall, type HelmRelease } from "@/lib/helm";
import type { DiscoveredApplication } from "@/lib/types";
import type * as k8s from "@kubernetes/client-node";
import { requireSession, generateTerminalToken } from "@/lib/auth";

export async function fetchClusterInfo(
  clusterId: string
): Promise<{ success: true; data: ClusterInfo & { connected: boolean } } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) {
      return { success: false, error: "Cluster not found" };
    }

    const connStatus = await checkConnection(cluster.kubeconfig_yaml);
    if (connStatus !== "connected") {
      return {
        success: true,
        data: {
          name: cluster.name,
          server: cluster.server,
          context: "",
          version: "N/A",
          nodeCount: 0,
          connected: false,
        },
      };
    }

    await updateLastConnected(clusterId);
    const info = await getClusterInfo(cluster.kubeconfig_yaml);
    return { success: true, data: { ...info, connected: true } };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch cluster info";
    return { success: false, error: message };
  }
}

export async function fetchNodes(
  clusterId: string
): Promise<{ success: true; data: NodeInfo[] } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) {
      return { success: false, error: "Cluster not found" };
    }

    const nodes = await getNodes(cluster.kubeconfig_yaml);
    return { success: true, data: nodes };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch nodes";
    return { success: false, error: message };
  }
}

export async function fetchNamespaces(
  clusterId: string
): Promise<{ success: true; data: string[] } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) {
      return { success: false, error: "Cluster not found" };
    }

    const namespaces = await getNamespaces(cluster.kubeconfig_yaml);
    return { success: true, data: namespaces };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch namespaces";
    return { success: false, error: message };
  }
}

export async function fetchPods(
  clusterId: string,
  namespace?: string
): Promise<{ success: true; data: PodInfo[] } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) {
      return { success: false, error: "Cluster not found" };
    }

    const pods = await getPods(cluster.kubeconfig_yaml, namespace);
    return { success: true, data: pods };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch pods";
    return { success: false, error: message };
  }
}

export async function fetchDeploymentPods(
  clusterId: string,
  namespace: string,
  selector: Record<string, string>
): Promise<{ success: true; data: PodInfo[] } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) {
      return { success: false, error: "Cluster not found" };
    }

    const pods = await getPodsByLabelSelector(cluster.kubeconfig_yaml, namespace, selector);
    return { success: true, data: pods };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch deployment pods";
    return { success: false, error: message };
  }
}

export async function fetchDeployments(
  clusterId: string,
  namespace?: string
): Promise<{ success: true; data: DeploymentInfo[] } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) {
      return { success: false, error: "Cluster not found" };
    }

    const deployments = await getDeployments(cluster.kubeconfig_yaml, namespace);
    return { success: true, data: deployments };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch deployments";
    return { success: false, error: message };
  }
}

export async function fetchServices(
  clusterId: string,
  namespace?: string
): Promise<{ success: true; data: ServiceInfo[] } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) {
      return { success: false, error: "Cluster not found" };
    }

    const services = await getServices(cluster.kubeconfig_yaml, namespace);
    return { success: true, data: services };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch services";
    return { success: false, error: message };
  }
}

export async function fetchIngresses(
  clusterId: string,
  namespace?: string
): Promise<{ success: true; data: IngressInfo[] } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) {
      return { success: false, error: "Cluster not found" };
    }

    const ingresses = await getIngresses(cluster.kubeconfig_yaml, namespace);
    return { success: true, data: ingresses };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch ingresses";
    return { success: false, error: message };
  }
}

export async function fetchIngressClasses(
  clusterId: string
): Promise<{ success: true; data: IngressClassInfo[] } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) {
      return { success: false, error: "Cluster not found" };
    }

    const ingressClasses = await getIngressClasses(cluster.kubeconfig_yaml);
    return { success: true, data: ingressClasses };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch ingress classes";
    return { success: false, error: message };
  }
}

export async function fetchNodeMetrics(
  clusterId: string
): Promise<{ success: true; data: NodeMetricsInfo[] } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };
    const metrics = await getNodeMetrics(cluster.kubeconfig_yaml);
    return { success: true, data: metrics };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch node metrics";
    return { success: false, error: message };
  }
}

export async function fetchPodMetrics(
  clusterId: string,
  namespace?: string
): Promise<{ success: true; data: PodMetricsInfo[] } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };
    const metrics = await getPodMetrics(cluster.kubeconfig_yaml, namespace);
    return { success: true, data: metrics };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch pod metrics";
    return { success: false, error: message };
  }
}

export async function fetchEvents(
  clusterId: string,
  namespace?: string
): Promise<{ success: true; data: ClusterEventInfo[] } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };
    const events = await getEvents(cluster.kubeconfig_yaml, namespace);
    return { success: true, data: events };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch events";
    return { success: false, error: message };
  }
}

export async function fetchClusterHealth(
  clusterId: string
): Promise<{ success: true; data: ClusterHealthSummary } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };
    const health = await getClusterHealthSummary(cluster.kubeconfig_yaml);
    return { success: true, data: health };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch cluster health";
    return { success: false, error: message };
  }
}

export async function fetchPodLogs(
  clusterId: string,
  namespace: string,
  pod: string,
  container: string,
  tailLines = 100
): Promise<{ success: true; data: string } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };
    const logs = await getPodLogSnapshot(cluster.kubeconfig_yaml, namespace, pod, container, tailLines);
    return { success: true, data: logs };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch pod logs";
    return { success: false, error: message };
  }
}

// --- Mutating actions ---

export async function cordonNodeAction(
  clusterId: string,
  nodeName: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };
    await cordonNode(cluster.kubeconfig_yaml, nodeName);
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to cordon node";
    return { success: false, error: message };
  }
}

export async function uncordonNodeAction(
  clusterId: string,
  nodeName: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };
    await uncordonNode(cluster.kubeconfig_yaml, nodeName);
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to uncordon node";
    return { success: false, error: message };
  }
}

export async function drainNodeAction(
  clusterId: string,
  nodeName: string,
  options?: { skipDaemonSets?: boolean }
): Promise<{ success: true; data: { evicted: string[]; errors: string[] } } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };
    const result = await drainNode(cluster.kubeconfig_yaml, nodeName, options);
    return { success: true, data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to drain node";
    return { success: false, error: message };
  }
}

export async function scaleDeploymentAction(
  clusterId: string,
  namespace: string,
  name: string,
  replicas: number
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireSession();
    if (!Number.isInteger(replicas) || replicas < 0 || replicas > 100) {
      return { success: false, error: "Replicas must be an integer between 0 and 100" };
    }
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };
    await scaleDeployment(cluster.kubeconfig_yaml, namespace, name, replicas);
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to scale deployment";
    return { success: false, error: message };
  }
}

export async function getResourceYamlAction(
  clusterId: string,
  apiVersion: string,
  kind: string,
  name: string,
  namespace?: string
): Promise<{ success: true; data: object } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };
    const resource = await getResourceYaml(cluster.kubeconfig_yaml, apiVersion, kind, name, namespace);
    return { success: true, data: resource };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to get resource YAML";
    return { success: false, error: message };
  }
}

const ALLOWED_RESOURCE_KINDS = new Set([
  "Deployment", "Service", "Ingress", "ConfigMap", "Secret",
  "PersistentVolumeClaim", "HorizontalPodAutoscaler", "CronJob", "Job",
  "StatefulSet", "DaemonSet", "Namespace", "ServiceAccount",
  "NetworkPolicy", "LimitRange", "ResourceQuota", "Pod",
]);

export async function applyResourceYamlAction(
  clusterId: string,
  resourceSpec: k8s.KubernetesObject
): Promise<{ success: true; data: object } | { success: false; error: string }> {
  try {
    await requireSession();

    const kind = resourceSpec.kind;
    if (!kind || !ALLOWED_RESOURCE_KINDS.has(kind)) {
      return { success: false, error: `Resource kind "${kind}" is not allowed` };
    }

    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };
    const result = await applyResourceYaml(cluster.kubeconfig_yaml, resourceSpec);
    return { success: true, data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to apply resource";
    return { success: false, error: message };
  }
}

export async function deleteResourceAction(
  clusterId: string,
  apiVersion: string,
  kind: string,
  name: string,
  namespace?: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireSession();
    if (!kind || !ALLOWED_RESOURCE_KINDS.has(kind)) {
      return { success: false, error: `Resource kind "${kind}" is not allowed` };
    }
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };
    await deleteResource(cluster.kubeconfig_yaml, apiVersion, kind, name, namespace);
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete resource";
    return { success: false, error: message };
  }
}

export async function fetchClusterRegistryUrl(
  clusterId: string
): Promise<{ success: true; data: string | null } | { success: false; error: string }> {
  try {
    await requireSession();
    const url = await getClusterRegistryUrl(clusterId);
    return { success: true, data: url };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch registry URL";
    return { success: false, error: message };
  }
}

export async function updateClusterRegistryUrl(
  clusterId: string,
  registryUrl: string | null
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireSession();
    await setClusterRegistryUrl(clusterId, registryUrl);
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update registry URL";
    return { success: false, error: message };
  }
}

export async function createNamespaceAction(
  clusterId: string,
  name: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };

    // Validate namespace name (RFC 1123)
    const validNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
    if (!validNameRegex.test(name) || name.length > 63) {
      return { success: false, error: "Invalid namespace name. Must be lowercase alphanumeric with hyphens, max 63 chars." };
    }

    await createNamespace(cluster.kubeconfig_yaml, name);
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create namespace";
    return { success: false, error: message };
  }
}

// --- Storage actions ---

export async function fetchPersistentVolumes(
  clusterId: string
): Promise<{ success: true; data: PersistentVolumeInfo[] } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };
    const pvs = await getPersistentVolumes(cluster.kubeconfig_yaml);
    return { success: true, data: pvs };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch persistent volumes";
    return { success: false, error: message };
  }
}

export async function fetchPersistentVolumeClaims(
  clusterId: string,
  namespace?: string
): Promise<{ success: true; data: PersistentVolumeClaimInfo[] } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };
    const pvcs = await getPersistentVolumeClaims(cluster.kubeconfig_yaml, namespace);
    return { success: true, data: pvcs };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch persistent volume claims";
    return { success: false, error: message };
  }
}

export async function fetchStorageClasses(
  clusterId: string
): Promise<{ success: true; data: StorageClassInfo[] } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };
    const storageClasses = await getStorageClasses(cluster.kubeconfig_yaml);
    return { success: true, data: storageClasses };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch storage classes";
    return { success: false, error: message };
  }
}

// --- Configuration (ConfigMaps & Secrets) ---

export async function fetchConfigMaps(
  clusterId: string,
  namespace?: string
): Promise<{ success: true; data: ConfigMapInfo[] } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };
    const configMaps = await getConfigMaps(cluster.kubeconfig_yaml, namespace);
    return { success: true, data: configMaps };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch config maps";
    return { success: false, error: message };
  }
}

export async function fetchSecrets(
  clusterId: string,
  namespace?: string
): Promise<{ success: true; data: SecretInfo[] } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };
    const secrets = await getSecrets(cluster.kubeconfig_yaml, namespace);
    return { success: true, data: secrets };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch secrets";
    return { success: false, error: message };
  }
}

// --- Applications ---

export async function fetchApplications(
  clusterId: string,
  namespace?: string
): Promise<{ success: true; data: DiscoveredApplication[] } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };

    const [deps, svcs, ings, pvcs, pods] = await Promise.all([
      getDeployments(cluster.kubeconfig_yaml, namespace),
      getServices(cluster.kubeconfig_yaml, namespace),
      getIngresses(cluster.kubeconfig_yaml, namespace),
      getPersistentVolumeClaims(cluster.kubeconfig_yaml, namespace),
      getPods(cluster.kubeconfig_yaml, namespace),
    ]);

    const apps = discoverApplications(deps, svcs, ings, pvcs, pods);
    return { success: true, data: apps };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch applications";
    return { success: false, error: message };
  }
}

// --- Helm actions ---

export async function fetchHelmReleases(
  clusterId: string,
  namespace?: string
): Promise<{ success: true; data: HelmRelease[] } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };
    const releases = await helmList(cluster.kubeconfig_yaml, namespace);
    return { success: true, data: releases };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch Helm releases";
    return { success: false, error: message };
  }
}

export async function uninstallHelmRelease(
  clusterId: string,
  releaseName: string,
  namespace: string
): Promise<{ success: true; data: string } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };
    const output = await helmUninstall(cluster.kubeconfig_yaml, releaseName, namespace);
    return { success: true, data: output };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to uninstall Helm release";
    return { success: false, error: message };
  }
}

export async function deleteApplicationResources(
  clusterId: string,
  resources: { apiVersion: string; kind: string; name: string; namespace: string }[]
): Promise<
  | { success: true; data: { deleted: string[]; errors: string[] } }
  | { success: false; error: string }
> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };

    const deleted: string[] = [];
    const errors: string[] = [];

    // Delete in order: Ingresses → Services → Deployments → PVCs
    const kindOrder = ["Ingress", "Service", "Deployment", "PersistentVolumeClaim"];
    const sorted = [...resources].sort(
      (a, b) => kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind)
    );

    for (const res of sorted) {
      const label = `${res.kind}/${res.namespace}/${res.name}`;
      try {
        await deleteResource(
          cluster.kubeconfig_yaml,
          res.apiVersion,
          res.kind,
          res.name,
          res.namespace
        );
        deleted.push(label);
      } catch (e) {
        errors.push(`${label}: ${e instanceof Error ? e.message : "delete failed"}`);
      }
    }

    return { success: true, data: { deleted, errors } };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete application resources";
    return { success: false, error: message };
  }
}

// --- Terminal token ---

export async function getTerminalToken(
  clusterId: string,
  namespace: string,
  pod: string,
): Promise<{ success: true; data: string } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };
    const token = generateTerminalToken(clusterId, pod, namespace);
    return { success: true, data: token };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to generate terminal token";
    return { success: false, error: message };
  }
}

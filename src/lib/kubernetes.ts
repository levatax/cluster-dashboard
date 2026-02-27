import * as k8s from "@kubernetes/client-node";
import { Readable, Writable } from "node:stream";

export type {
  NodeInfo,
  ClusterInfo,
  PodInfo,
  DeploymentInfo,
  ServiceInfo,
  IngressInfo,
  NodeMetricsInfo,
  PodMetricsInfo,
  ClusterEventInfo,
  ClusterHealthSummary,
  PersistentVolumeInfo,
  PersistentVolumeClaimInfo,
  StorageClassInfo,
} from "@/lib/types";

import type {
  NodeInfo,
  ClusterInfo,
  PodInfo,
  DeploymentInfo,
  ServiceInfo,
  IngressInfo,
  NodeMetricsInfo,
  PodMetricsInfo,
  ClusterEventInfo,
  ClusterHealthSummary,
  PersistentVolumeInfo,
  PersistentVolumeClaimInfo,
  StorageClassInfo,
} from "@/lib/types";

function createKubeConfig(yaml: string): k8s.KubeConfig {
  const kc = new k8s.KubeConfig();
  kc.loadFromString(yaml);
  return kc;
}

export function parseCpuValue(cpu: string): number {
  if (cpu.endsWith("n")) return parseInt(cpu, 10) / 1_000_000;
  if (cpu.endsWith("u")) return parseInt(cpu, 10) / 1_000;
  if (cpu.endsWith("m")) return parseInt(cpu, 10);
  return parseFloat(cpu) * 1000;
}

export function parseMemoryValue(mem: string): number {
  const units: Record<string, number> = {
    Ki: 1024,
    Mi: 1024 ** 2,
    Gi: 1024 ** 3,
    Ti: 1024 ** 4,
    K: 1000,
    M: 1000 ** 2,
    G: 1000 ** 3,
    T: 1000 ** 4,
  };
  for (const [suffix, multiplier] of Object.entries(units)) {
    if (mem.endsWith(suffix)) {
      return parseInt(mem.replace(suffix, ""), 10) * multiplier;
    }
  }
  return parseInt(mem, 10);
}

export { formatCpuMillicores, formatBytes } from "@/lib/format";

function calculateAge(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days > 365) return `${Math.floor(days / 365)}y`;
  if (days > 0) return `${days}d`;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours > 0) return `${hours}h`;
  const minutes = Math.floor(diffMs / (1000 * 60));
  return `${minutes}m`;
}

function formatMemory(kilobytes: string): string {
  const ki = parseInt(kilobytes.replace("Ki", ""), 10);
  if (isNaN(ki)) return kilobytes;
  const gi = ki / (1024 * 1024);
  if (gi >= 1) return `${gi.toFixed(1)} Gi`;
  const mi = ki / 1024;
  return `${mi.toFixed(0)} Mi`;
}

export async function checkConnection(yaml: string): Promise<boolean> {
  try {
    const kc = createKubeConfig(yaml);
    const api = kc.makeApiClient(k8s.VersionApi);
    await api.getCode();
    return true;
  } catch {
    return false;
  }
}

export async function getClusterVersion(yaml: string): Promise<string> {
  const kc = createKubeConfig(yaml);
  const api = kc.makeApiClient(k8s.VersionApi);
  const version = await api.getCode();
  return `${version.major}.${version.minor}`;
}

export async function getNodes(yaml: string): Promise<NodeInfo[]> {
  const kc = createKubeConfig(yaml);
  const api = kc.makeApiClient(k8s.CoreV1Api);
  const response = await api.listNode();
  const nodes = response.items;

  return nodes.map((node) => {
    const labels = node.metadata?.labels || {};
    const roles = Object.keys(labels)
      .filter((l) => l.startsWith("node-role.kubernetes.io/"))
      .map((l) => l.replace("node-role.kubernetes.io/", ""));
    if (roles.length === 0) roles.push("<none>");

    const conditions = node.status?.conditions || [];
    const readyCondition = conditions.find((c) => c.type === "Ready");
    const status = readyCondition?.status === "True" ? "Ready" : "NotReady";

    const addresses = node.status?.addresses || [];
    const internalIP =
      addresses.find((a) => a.type === "InternalIP")?.address || "";

    const capacity = node.status?.capacity || {};

    return {
      name: node.metadata?.name || "",
      status,
      roles,
      age: node.metadata?.creationTimestamp
        ? calculateAge(new Date(node.metadata.creationTimestamp))
        : "",
      version: node.status?.nodeInfo?.kubeletVersion || "",
      os: node.status?.nodeInfo?.operatingSystem || "",
      arch: node.status?.nodeInfo?.architecture || "",
      cpu: capacity.cpu || "",
      memory: capacity.memory ? formatMemory(capacity.memory) : "",
      internalIP,
      schedulable: !node.spec?.unschedulable,
    };
  });
}

export async function getClusterInfo(yaml: string): Promise<ClusterInfo> {
  const kc = createKubeConfig(yaml);
  const currentContext = kc.getCurrentContext();
  const context = kc.getContextObject(currentContext);
  const cluster = context ? kc.getCluster(context.cluster) : null;

  const [version, nodes] = await Promise.all([
    getClusterVersion(yaml),
    getNodes(yaml),
  ]);

  return {
    name: context?.cluster || "",
    server: cluster?.server || "",
    context: currentContext,
    version,
    nodeCount: nodes.length,
  };
}

export async function getNamespaces(yaml: string): Promise<string[]> {
  const kc = createKubeConfig(yaml);
  const api = kc.makeApiClient(k8s.CoreV1Api);
  const response = await api.listNamespace();
  return response.items
    .map((ns) => ns.metadata?.name || "")
    .filter(Boolean)
    .sort();
}

function derivePodStatus(pod: k8s.V1Pod): string {
  const phase = pod.status?.phase || "Unknown";
  const containerStatuses = pod.status?.containerStatuses || [];
  const conditions = pod.status?.conditions || [];

  // Check if pod is being deleted
  if (pod.metadata?.deletionTimestamp) {
    return "Terminating";
  }

  // Check container states for specific reasons
  for (const cs of containerStatuses) {
    if (cs.state?.waiting?.reason) {
      return cs.state.waiting.reason; // CrashLoopBackOff, ImagePullBackOff, etc.
    }
    if (cs.state?.terminated?.reason) {
      return cs.state.terminated.reason; // OOMKilled, Error, Completed, etc.
    }
  }

  // Check pod conditions for node issues
  const readyCondition = conditions.find((c) => c.type === "Ready");
  if (readyCondition?.status === "False") {
    // Check for node-related issues
    if (readyCondition.reason === "PodCompleted") {
      return "Completed";
    }
    if (readyCondition.reason) {
      return readyCondition.reason; // NodeLost, Unschedulable, etc.
    }
  }

  // Check ContainersReady condition
  const containersReadyCondition = conditions.find((c) => c.type === "ContainersReady");
  if (containersReadyCondition?.status === "False" && phase === "Running") {
    // Pod phase says Running but containers aren't ready - likely node issue
    if (containersReadyCondition.reason) {
      return containersReadyCondition.reason;
    }
    return "NotReady";
  }

  // If phase is Running but no containers are ready, mark as NotReady
  if (phase === "Running" && containerStatuses.length > 0) {
    const anyReady = containerStatuses.some((cs) => cs.ready);
    if (!anyReady) {
      return "NotReady";
    }
  }

  return phase;
}

export async function getPods(
  yaml: string,
  namespace?: string
): Promise<PodInfo[]> {
  const kc = createKubeConfig(yaml);
  const api = kc.makeApiClient(k8s.CoreV1Api);
  const response = namespace
    ? await api.listNamespacedPod({ namespace })
    : await api.listPodForAllNamespaces();

  return response.items.map((pod) => {
    const containerStatuses = pod.status?.containerStatuses || [];
    const readyCount = containerStatuses.filter((c) => c.ready).length;
    const totalCount = (pod.spec?.containers || []).length;
    const restarts = containerStatuses.reduce(
      (sum, c) => sum + (c.restartCount || 0),
      0
    );

    return {
      name: pod.metadata?.name || "",
      namespace: pod.metadata?.namespace || "",
      status: derivePodStatus(pod),
      ready: `${readyCount}/${totalCount}`,
      restarts,
      age: pod.metadata?.creationTimestamp
        ? calculateAge(new Date(pod.metadata.creationTimestamp))
        : "",
      node: pod.spec?.nodeName || "",
      ip: pod.status?.podIP || "",
      labels: (pod.metadata?.labels as Record<string, string>) || {},
      annotations: (pod.metadata?.annotations as Record<string, string>) || {},
      containers: (pod.spec?.containers || []).map((c) => {
        const cs = containerStatuses.find((s) => s.name === c.name);
        const state = cs?.state?.running
          ? "Running"
          : cs?.state?.waiting
            ? "Waiting"
            : cs?.state?.terminated
              ? "Terminated"
              : "Unknown";
        const reason =
          cs?.state?.waiting?.reason ||
          cs?.state?.terminated?.reason ||
          "";
        return {
          name: c.name,
          image: c.image || "",
          ready: cs?.ready || false,
          restarts: cs?.restartCount || 0,
          state,
          reason,
        };
      }),
    };
  });
}

export async function getPodsByLabelSelector(
  yaml: string,
  namespace: string,
  labelSelector: Record<string, string>
): Promise<PodInfo[]> {
  const kc = createKubeConfig(yaml);
  const api = kc.makeApiClient(k8s.CoreV1Api);
  const selectorStr = Object.entries(labelSelector)
    .map(([k, v]) => `${k}=${v}`)
    .join(",");
  const response = await api.listNamespacedPod({ namespace, labelSelector: selectorStr });

  return response.items.map((pod) => {
    const containerStatuses = pod.status?.containerStatuses || [];
    const readyCount = containerStatuses.filter((c) => c.ready).length;
    const totalCount = (pod.spec?.containers || []).length;
    const restarts = containerStatuses.reduce(
      (sum, c) => sum + (c.restartCount || 0),
      0
    );

    return {
      name: pod.metadata?.name || "",
      namespace: pod.metadata?.namespace || "",
      status: derivePodStatus(pod),
      ready: `${readyCount}/${totalCount}`,
      restarts,
      age: pod.metadata?.creationTimestamp
        ? calculateAge(new Date(pod.metadata.creationTimestamp))
        : "",
      node: pod.spec?.nodeName || "",
      ip: pod.status?.podIP || "",
      labels: (pod.metadata?.labels as Record<string, string>) || {},
      annotations: (pod.metadata?.annotations as Record<string, string>) || {},
      containers: (pod.spec?.containers || []).map((c) => {
        const cs = containerStatuses.find((s) => s.name === c.name);
        const state = cs?.state?.running
          ? "Running"
          : cs?.state?.waiting
            ? "Waiting"
            : cs?.state?.terminated
              ? "Terminated"
              : "Unknown";
        const reason =
          cs?.state?.waiting?.reason ||
          cs?.state?.terminated?.reason ||
          "";
        return {
          name: c.name,
          image: c.image || "",
          ready: cs?.ready || false,
          restarts: cs?.restartCount || 0,
          state,
          reason,
        };
      }),
    };
  });
}

export async function getDeployments(
  yaml: string,
  namespace?: string
): Promise<DeploymentInfo[]> {
  const kc = createKubeConfig(yaml);
  const api = kc.makeApiClient(k8s.AppsV1Api);
  const response = namespace
    ? await api.listNamespacedDeployment({ namespace })
    : await api.listDeploymentForAllNamespaces();

  return response.items.map((dep) => {
    const desired = dep.spec?.replicas ?? 0;
    const ready = dep.status?.readyReplicas ?? 0;

    return {
      name: dep.metadata?.name || "",
      namespace: dep.metadata?.namespace || "",
      ready: `${ready}/${desired}`,
      replicas: desired,
      upToDate: dep.status?.updatedReplicas ?? 0,
      available: dep.status?.availableReplicas ?? 0,
      age: dep.metadata?.creationTimestamp
        ? calculateAge(new Date(dep.metadata.creationTimestamp))
        : "",
      labels: (dep.metadata?.labels as Record<string, string>) || {},
      annotations: (dep.metadata?.annotations as Record<string, string>) || {},
      selector: (dep.spec?.selector?.matchLabels as Record<string, string>) || {},
      conditions: (dep.status?.conditions || []).map((c) => ({
        type: c.type,
        status: c.status,
        reason: c.reason || "",
        message: c.message || "",
      })),
    };
  });
}

export async function getServices(
  yaml: string,
  namespace?: string
): Promise<ServiceInfo[]> {
  const kc = createKubeConfig(yaml);
  const api = kc.makeApiClient(k8s.CoreV1Api);
  const response = namespace
    ? await api.listNamespacedService({ namespace })
    : await api.listServiceForAllNamespaces();

  return response.items.map((svc) => {
    const ports = (svc.spec?.ports || [])
      .map((p) => {
        const port = p.nodePort ? `${p.port}:${p.nodePort}/${p.protocol}` : `${p.port}/${p.protocol}`;
        return port;
      })
      .join(", ");

    const externalIPs = svc.status?.loadBalancer?.ingress
      ?.map((i) => i.ip || i.hostname || "")
      .filter(Boolean)
      .join(", ") || svc.spec?.externalIPs?.join(", ") || "<none>";

    return {
      name: svc.metadata?.name || "",
      namespace: svc.metadata?.namespace || "",
      type: svc.spec?.type || "",
      clusterIP: svc.spec?.clusterIP || "",
      externalIP: externalIPs,
      ports,
      age: svc.metadata?.creationTimestamp
        ? calculateAge(new Date(svc.metadata.creationTimestamp))
        : "",
      labels: (svc.metadata?.labels as Record<string, string>) || {},
      annotations: (svc.metadata?.annotations as Record<string, string>) || {},
      selector: (svc.spec?.selector as Record<string, string>) || {},
    };
  });
}

export async function getIngresses(
  yaml: string,
  namespace?: string
): Promise<IngressInfo[]> {
  const kc = createKubeConfig(yaml);
  const api = kc.makeApiClient(k8s.NetworkingV1Api);
  const response = namespace
    ? await api.listNamespacedIngress({ namespace })
    : await api.listIngressForAllNamespaces();

  return response.items.map((ing) => {
    const hosts = (ing.spec?.rules || [])
      .map((r) => r.host || "*")
      .join(", ");

    const addresses = (ing.status?.loadBalancer?.ingress || [])
      .map((i) => i.ip || i.hostname || "")
      .filter(Boolean)
      .join(", ") || "<none>";

    const tlsPorts = ing.spec?.tls?.length ? "80, 443" : "80";

    return {
      name: ing.metadata?.name || "",
      namespace: ing.metadata?.namespace || "",
      hosts,
      addresses,
      ports: tlsPorts,
      ingressClass:
        ing.spec?.ingressClassName ||
        ing.metadata?.annotations?.["kubernetes.io/ingress.class"] ||
        "",
      age: ing.metadata?.creationTimestamp
        ? calculateAge(new Date(ing.metadata.creationTimestamp))
        : "",
      labels: (ing.metadata?.labels as Record<string, string>) || {},
      annotations: (ing.metadata?.annotations as Record<string, string>) || {},
      rules: (ing.spec?.rules || []).map((r) => ({
        host: r.host || "*",
        paths: (r.http?.paths || []).map((p) => ({
          path: p.path || "/",
          backend: p.backend.service
            ? `${p.backend.service.name}:${p.backend.service.port?.number || p.backend.service.port?.name || ""}`
            : "",
        })),
      })),
    };
  });
}

export interface IngressClassInfo {
  name: string;
  controller: string;
  isDefault: boolean;
}

export async function getIngressClasses(yaml: string): Promise<IngressClassInfo[]> {
  const kc = createKubeConfig(yaml);
  const api = kc.makeApiClient(k8s.NetworkingV1Api);
  const response = await api.listIngressClass();

  return response.items.map((ic) => ({
    name: ic.metadata?.name || "",
    controller: ic.spec?.controller || "",
    isDefault: ic.metadata?.annotations?.["ingressclass.kubernetes.io/is-default-class"] === "true",
  })).sort((a, b) => {
    // Default class first, then alphabetically
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function getNodeMetrics(yaml: string): Promise<NodeMetricsInfo[]> {
  const kc = createKubeConfig(yaml);
  const metricsClient = new k8s.Metrics(kc);
  const api = kc.makeApiClient(k8s.CoreV1Api);

  const [metricsList, nodeList] = await Promise.all([
    metricsClient.getNodeMetrics(),
    api.listNode(),
  ]);

  const capacityMap = new Map<string, { cpu: number; memory: number }>();
  for (const node of nodeList.items) {
    const cap = node.status?.capacity || {};
    capacityMap.set(node.metadata?.name || "", {
      cpu: parseCpuValue(cap.cpu || "0"),
      memory: parseMemoryValue(cap.memory || "0"),
    });
  }

  return metricsList.items.map((m) => {
    const cpuUsage = parseCpuValue(m.usage.cpu);
    const memUsage = parseMemoryValue(m.usage.memory);
    const cap = capacityMap.get(m.metadata.name) || { cpu: 1, memory: 1 };

    return {
      name: m.metadata.name,
      cpuUsage,
      cpuCapacity: cap.cpu,
      cpuPercent: cap.cpu > 0 ? (cpuUsage / cap.cpu) * 100 : 0,
      memoryUsage: memUsage,
      memoryCapacity: cap.memory,
      memoryPercent: cap.memory > 0 ? (memUsage / cap.memory) * 100 : 0,
    };
  });
}

export async function getPodMetrics(
  yaml: string,
  namespace?: string
): Promise<PodMetricsInfo[]> {
  const kc = createKubeConfig(yaml);
  const metricsClient = new k8s.Metrics(kc);
  const list = await metricsClient.getPodMetrics(namespace);

  return list.items.map((m) => {
    const containers = m.containers.map((c) => ({
      name: c.name,
      cpuUsage: parseCpuValue(c.usage.cpu),
      memoryUsage: parseMemoryValue(c.usage.memory),
    }));
    return {
      name: m.metadata.name,
      namespace: m.metadata.namespace,
      cpuUsage: containers.reduce((s, c) => s + c.cpuUsage, 0),
      memoryUsage: containers.reduce((s, c) => s + c.memoryUsage, 0),
      containers,
    };
  });
}

export async function getEvents(
  yaml: string,
  namespace?: string
): Promise<ClusterEventInfo[]> {
  const kc = createKubeConfig(yaml);
  const api = kc.makeApiClient(k8s.CoreV1Api);
  const response = namespace
    ? await api.listNamespacedEvent({ namespace })
    : await api.listEventForAllNamespaces();

  return response.items
    .map((ev) => ({
      name: ev.metadata?.name || "",
      namespace: ev.metadata?.namespace || "",
      type: ev.type || "Normal",
      reason: ev.reason || "",
      message: ev.message || "",
      involvedObject: `${ev.involvedObject?.kind || ""}/${ev.involvedObject?.name || ""}`,
      source: ev.source?.component || "",
      count: ev.count || 1,
      firstTimestamp: ev.firstTimestamp ? new Date(ev.firstTimestamp).toISOString() : null,
      lastTimestamp: ev.lastTimestamp ? new Date(ev.lastTimestamp).toISOString() : null,
      age: ev.lastTimestamp
        ? calculateAge(new Date(ev.lastTimestamp))
        : ev.metadata?.creationTimestamp
          ? calculateAge(new Date(ev.metadata.creationTimestamp))
          : "",
    }))
    .sort((a, b) => {
      const ta = a.lastTimestamp || a.firstTimestamp || "";
      const tb = b.lastTimestamp || b.firstTimestamp || "";
      return tb.localeCompare(ta);
    })
    .slice(0, 200);
}

export async function getClusterHealthSummary(
  yaml: string
): Promise<ClusterHealthSummary> {
  const kc = createKubeConfig(yaml);
  const coreApi = kc.makeApiClient(k8s.CoreV1Api);
  const appsApi = kc.makeApiClient(k8s.AppsV1Api);

  const [nodeList, podList, depList, eventList] = await Promise.all([
    coreApi.listNode(),
    coreApi.listPodForAllNamespaces(),
    appsApi.listDeploymentForAllNamespaces(),
    coreApi.listEventForAllNamespaces(),
  ]);

  const nodesReady = nodeList.items.filter((n) => {
    const ready = n.status?.conditions?.find((c) => c.type === "Ready");
    return ready?.status === "True";
  }).length;

  const podPhases = podList.items.map((p) => p.status?.phase || "Unknown");
  const podsRunning = podPhases.filter((p) => p === "Running").length;
  const podsPending = podPhases.filter((p) => p === "Pending").length;
  const podsFailed = podPhases.filter((p) => p === "Failed").length;

  const deploymentsHealthy = depList.items.filter((d) => {
    const desired = d.spec?.replicas ?? 0;
    const ready = d.status?.readyReplicas ?? 0;
    return desired > 0 && ready >= desired;
  }).length;

  const warningEvents = eventList.items.filter((e) => e.type === "Warning").length;

  let cpuAvgPercent: number | null = null;
  let memoryAvgPercent: number | null = null;
  let metricsAvailable = false;

  try {
    const metricsClient = new k8s.Metrics(kc);
    const nodeMetrics = await metricsClient.getNodeMetrics();
    if (nodeMetrics.items.length > 0) {
      metricsAvailable = true;
      const capacityMap = new Map<string, { cpu: number; memory: number }>();
      for (const node of nodeList.items) {
        const cap = node.status?.capacity || {};
        capacityMap.set(node.metadata?.name || "", {
          cpu: parseCpuValue(cap.cpu || "0"),
          memory: parseMemoryValue(cap.memory || "0"),
        });
      }
      let totalCpuPct = 0;
      let totalMemPct = 0;
      for (const m of nodeMetrics.items) {
        const cap = capacityMap.get(m.metadata.name) || { cpu: 1, memory: 1 };
        totalCpuPct += cap.cpu > 0 ? (parseCpuValue(m.usage.cpu) / cap.cpu) * 100 : 0;
        totalMemPct += cap.memory > 0 ? (parseMemoryValue(m.usage.memory) / cap.memory) * 100 : 0;
      }
      cpuAvgPercent = totalCpuPct / nodeMetrics.items.length;
      memoryAvgPercent = totalMemPct / nodeMetrics.items.length;
    }
  } catch {
    // metrics-server not available
  }

  return {
    nodesReady,
    nodesTotal: nodeList.items.length,
    podsRunning,
    podsPending,
    podsFailed,
    podsTotal: podList.items.length,
    deploymentsHealthy,
    deploymentsTotal: depList.items.length,
    warningEvents,
    cpuAvgPercent,
    memoryAvgPercent,
    metricsAvailable,
  };
}

// --- Mutating operations ---

export async function cordonNode(yaml: string, nodeName: string): Promise<void> {
  const kc = createKubeConfig(yaml);
  const api = kc.makeApiClient(k8s.CoreV1Api);
  await api.patchNode({
    name: nodeName,
    body: [{ op: "replace", path: "/spec/unschedulable", value: true }],
  });
}

export async function uncordonNode(yaml: string, nodeName: string): Promise<void> {
  const kc = createKubeConfig(yaml);
  const api = kc.makeApiClient(k8s.CoreV1Api);
  await api.patchNode({
    name: nodeName,
    body: [{ op: "replace", path: "/spec/unschedulable", value: false }],
  });
}

export async function drainNode(
  yaml: string,
  nodeName: string,
  options?: { ignoreDaemonSets?: boolean }
): Promise<{ evicted: string[]; errors: string[] }> {
  const kc = createKubeConfig(yaml);
  const api = kc.makeApiClient(k8s.CoreV1Api);

  // Step 1: Cordon the node
  await cordonNode(yaml, nodeName);

  // Step 2: List pods on the node
  const podList = await api.listPodForAllNamespaces({
    fieldSelector: `spec.nodeName=${nodeName}`,
  });

  const evicted: string[] = [];
  const errors: string[] = [];

  for (const pod of podList.items) {
    const ns = pod.metadata?.namespace || "";
    const name = pod.metadata?.name || "";

    // Skip mirror pods (static pods)
    if (pod.metadata?.annotations?.["kubernetes.io/config.mirror"]) continue;

    // Skip DaemonSet pods if requested
    if (options?.ignoreDaemonSets !== false) {
      const ownerRefs = pod.metadata?.ownerReferences || [];
      if (ownerRefs.some((ref) => ref.kind === "DaemonSet")) continue;
    }

    try {
      await api.createNamespacedPodEviction({
        name,
        namespace: ns,
        body: {
          apiVersion: "policy/v1",
          kind: "Eviction",
          metadata: { name, namespace: ns },
        },
      });
      evicted.push(`${ns}/${name}`);
    } catch (e) {
      errors.push(`${ns}/${name}: ${e instanceof Error ? e.message : "eviction failed"}`);
    }
  }

  return { evicted, errors };
}

export async function scaleDeployment(
  yaml: string,
  namespace: string,
  name: string,
  replicas: number
): Promise<void> {
  const kc = createKubeConfig(yaml);
  const api = kc.makeApiClient(k8s.AppsV1Api);
  const current = await api.readNamespacedDeploymentScale({ name, namespace });
  await api.replaceNamespacedDeploymentScale({
    name,
    namespace,
    body: { ...current, spec: { replicas } },
  });
}

export async function getResourceYaml(
  yaml: string,
  apiVersion: string,
  kind: string,
  name: string,
  namespace?: string
): Promise<object> {
  const kc = createKubeConfig(yaml);
  const client = k8s.KubernetesObjectApi.makeApiClient(kc);
  const spec = { apiVersion, kind, metadata: { name, namespace } } as k8s.KubernetesObject & {
    metadata: { name: string; namespace?: string };
  };
  const response = await client.read(spec);
  return JSON.parse(JSON.stringify(response)) as object;
}

export async function applyResourceYaml(
  yaml: string,
  resourceSpec: k8s.KubernetesObject
): Promise<object> {
  const kc = createKubeConfig(yaml);
  const client = k8s.KubernetesObjectApi.makeApiClient(kc);
  const spec = resourceSpec as k8s.KubernetesObject & {
    metadata: { name: string; namespace?: string };
  };
  try {
    // Try to read first — if it exists, patch it
    await client.read(spec);
    const response = await client.patch(
      spec,
      undefined,
      undefined,
      undefined,
      undefined,
      k8s.PatchStrategy.StrategicMergePatch
    );
    return JSON.parse(JSON.stringify(response)) as object;
  } catch {
    // Resource doesn't exist — create it
    const response = await client.create(spec);
    return JSON.parse(JSON.stringify(response)) as object;
  }
}

export async function deleteResource(
  yaml: string,
  apiVersion: string,
  kind: string,
  name: string,
  namespace?: string
): Promise<void> {
  const kc = createKubeConfig(yaml);
  const client = k8s.KubernetesObjectApi.makeApiClient(kc);
  const spec = { apiVersion, kind, metadata: { name, namespace } } as k8s.KubernetesObject & {
    metadata: { name: string; namespace?: string };
  };
  await client.delete(spec);
}

export async function getPodLogSnapshot(
  yaml: string,
  namespace: string,
  pod: string,
  container: string,
  tailLines = 100
): Promise<string> {
  const kc = createKubeConfig(yaml);
  const api = kc.makeApiClient(k8s.CoreV1Api);
  const resp = await api.readNamespacedPodLog({
    name: pod,
    namespace,
    container,
    tailLines,
  });
  return resp;
}

// --- Build Job (Kaniko) ---

export interface BuildJobParams {
  jobName: string;
  namespace: string;
  repoHttpsUrl: string;
  githubToken?: string;
  branch: string;
  destination: string;
  registryUrl: string;
  appName: string;
  dockerfilePath?: string;
  buildArgs?: Record<string, string>;
}

export async function createBuildJob(kubeconfig: string, params: BuildJobParams): Promise<void> {
  const kc = createKubeConfig(kubeconfig);
  const batchApi = kc.makeApiClient(k8s.BatchV1Api);

  const kanikoArgs = [
    `--dockerfile=${params.dockerfilePath || "Dockerfile"}`,
    "--context=/workspace",
    `--destination=${params.destination}`,
    "--insecure",
    "--skip-tls-verify",
    "--cache=true",
    `--cache-repo=${params.registryUrl}/${params.appName}-cache`,
    ...Object.entries(params.buildArgs || {}).map(
      ([key, value]) => `--build-arg=${key}=${value}`
    ),
  ];

  const job: k8s.V1Job = {
    apiVersion: "batch/v1",
    kind: "Job",
    metadata: {
      name: params.jobName,
      namespace: params.namespace,
    },
    spec: {
      ttlSecondsAfterFinished: 600,
      backoffLimit: 2,
      template: {
        spec: {
          restartPolicy: "Never",
          initContainers: [
            {
              name: "git-clone",
              image: "alpine/git",
              command: ["sh", "-c"],
              args: [
                `if [ -n "$GIT_TOKEN" ]; then printf 'machine github.com\\n  login oauth2\\n  password %s\\n' "$GIT_TOKEN" > /root/.netrc && chmod 600 /root/.netrc; fi && git clone --depth=1 -b "$GIT_BRANCH" "$GIT_REPO_URL" /workspace`,
              ],
              env: [
                { name: "GIT_REPO_URL", value: params.repoHttpsUrl },
                { name: "GIT_BRANCH", value: params.branch },
                ...(params.githubToken ? [{ name: "GIT_TOKEN", value: params.githubToken }] : []),
              ],
              volumeMounts: [{ name: "workspace", mountPath: "/workspace" }],
            },
          ],
          containers: [
            {
              name: "kaniko",
              image: "gcr.io/kaniko-project/executor:latest",
              args: kanikoArgs,
              volumeMounts: [{ name: "workspace", mountPath: "/workspace" }],
              resources: {
                requests: { memory: "512Mi", cpu: "500m" },
                limits: { memory: "4Gi", cpu: "2000m" },
              },
            },
          ],
          volumes: [{ name: "workspace", emptyDir: {} }],
        },
      },
    },
  };

  // Delete existing job with the same name (e.g. re-deploying the same commit)
  try {
    await batchApi.deleteNamespacedJob({
      name: params.jobName,
      namespace: params.namespace,
      body: { propagationPolicy: "Background" },
    });
    // Brief wait for the old job's pods to start terminating
    await new Promise((r) => setTimeout(r, 2000));
  } catch {
    // Job doesn't exist yet — that's fine
  }

  await batchApi.createNamespacedJob({ namespace: params.namespace, body: job });
}

export type BuildJobPhase = "pending" | "running" | "succeeded" | "failed";

export async function getBuildJobStatus(
  kubeconfig: string,
  namespace: string,
  jobName: string
): Promise<{ phase: BuildJobPhase; message?: string }> {
  const kc = createKubeConfig(kubeconfig);
  const batchApi = kc.makeApiClient(k8s.BatchV1Api);
  const coreApi = kc.makeApiClient(k8s.CoreV1Api);

  const job = await batchApi.readNamespacedJob({ name: jobName, namespace });
  const status = job.status;

  if (status?.succeeded && status.succeeded > 0) return { phase: "succeeded" };
  if (status?.failed && status.failed > 0) {
    // Get the actual error from the pod instead of the generic Job condition message
    let message = "Build failed";
    try {
      const podList = await coreApi.listNamespacedPod({
        namespace,
        labelSelector: `job-name=${jobName}`,
      });
      const pod = podList.items[podList.items.length - 1]; // latest pod
      if (pod) {
        // Check init container failures (git-clone)
        const initStatuses = pod.status?.initContainerStatuses || [];
        for (const cs of initStatuses) {
          if (cs.state?.terminated && cs.state.terminated.exitCode !== 0) {
            message = `Init container '${cs.name}' failed (exit code ${cs.state.terminated.exitCode})`;
            if (cs.state.terminated.reason) message += `: ${cs.state.terminated.reason}`;
            break;
          }
          if (cs.state?.waiting?.reason) {
            message = `Init container '${cs.name}': ${cs.state.waiting.reason}${cs.state.waiting.message ? ` — ${cs.state.waiting.message}` : ""}`;
            break;
          }
        }
        // Check main container failures (kaniko)
        if (message === "Build failed") {
          const containerStatuses = pod.status?.containerStatuses || [];
          for (const cs of containerStatuses) {
            if (cs.state?.terminated && cs.state.terminated.exitCode !== 0) {
              message = `Container '${cs.name}' failed (exit code ${cs.state.terminated.exitCode})`;
              if (cs.state.terminated.reason) message += `: ${cs.state.terminated.reason}`;
              if (cs.state.terminated.message) message += ` — ${cs.state.terminated.message}`;
              break;
            }
            if (cs.state?.waiting?.reason) {
              message = `Container '${cs.name}': ${cs.state.waiting.reason}${cs.state.waiting.message ? ` — ${cs.state.waiting.message}` : ""}`;
              break;
            }
          }
        }
      }
    } catch {
      // Fall back to job condition message
      const conditions = status.conditions || [];
      const failedCond = conditions.find((c) => c.type === "Failed");
      if (failedCond?.message) message = failedCond.message;
    }
    return { phase: "failed", message };
  }
  if (status?.active && status.active > 0) return { phase: "running" };
  return { phase: "pending" };
}

export async function getBuildLogs(
  kubeconfig: string,
  namespace: string,
  jobName: string,
  tailLines = 100
): Promise<string> {
  const kc = createKubeConfig(kubeconfig);
  const coreApi = kc.makeApiClient(k8s.CoreV1Api);

  const podList = await coreApi.listNamespacedPod({
    namespace,
    labelSelector: `job-name=${jobName}`,
  });

  const pod = podList.items[0];
  if (!pod) return "";
  const podName = pod.metadata?.name || "";
  if (!podName) return "";

  // Use git-clone container if init container hasn't finished yet
  const initStatuses = pod.status?.initContainerStatuses || [];
  const gitCloneStatus = initStatuses.find((s) => s.name === "git-clone");
  const isInitRunning = gitCloneStatus && !gitCloneStatus.state?.terminated;
  const container = isInitRunning ? "git-clone" : "kaniko";

  try {
    return await getPodLogSnapshot(kubeconfig, namespace, podName, container, tailLines);
  } catch {
    return "";
  }
}

export async function deleteBuildJob(
  kubeconfig: string,
  namespace: string,
  jobName: string
): Promise<void> {
  const kc = createKubeConfig(kubeconfig);
  const batchApi = kc.makeApiClient(k8s.BatchV1Api);
  await batchApi.deleteNamespacedJob({
    name: jobName,
    namespace,
    body: { propagationPolicy: "Foreground" },
  });
}

export async function createNamespace(yaml: string, name: string): Promise<void> {
  const kc = createKubeConfig(yaml);
  const api = kc.makeApiClient(k8s.CoreV1Api);
  await api.createNamespace({
    body: {
      metadata: { name },
    },
  });
}

export async function namespaceExists(yaml: string, name: string): Promise<boolean> {
  const kc = createKubeConfig(yaml);
  const api = kc.makeApiClient(k8s.CoreV1Api);
  try {
    await api.readNamespace({ name });
    return true;
  } catch {
    return false;
  }
}

// --- Storage resources ---

function formatCapacity(quantity: string): string {
  if (!quantity) return "";
  return quantity;
}

function parseCapacityBytes(quantity: string): number {
  if (!quantity) return 0;
  return parseMemoryValue(quantity);
}

export async function getPersistentVolumes(
  yaml: string
): Promise<PersistentVolumeInfo[]> {
  const kc = createKubeConfig(yaml);
  const api = kc.makeApiClient(k8s.CoreV1Api);
  const response = await api.listPersistentVolume();

  return response.items.map((pv) => {
    const capacity = pv.spec?.capacity?.storage || "";
    const claimRef = pv.spec?.claimRef
      ? `${pv.spec.claimRef.namespace}/${pv.spec.claimRef.name}`
      : "";

    return {
      name: pv.metadata?.name || "",
      status: pv.status?.phase || "Unknown",
      capacity: formatCapacity(capacity),
      capacityBytes: parseCapacityBytes(capacity),
      accessModes: pv.spec?.accessModes || [],
      reclaimPolicy: pv.spec?.persistentVolumeReclaimPolicy || "",
      storageClassName: pv.spec?.storageClassName || "",
      claimRef,
      volumeMode: pv.spec?.volumeMode || "Filesystem",
      reason: pv.status?.reason || "",
      age: pv.metadata?.creationTimestamp
        ? calculateAge(new Date(pv.metadata.creationTimestamp))
        : "",
      labels: (pv.metadata?.labels as Record<string, string>) || {},
      annotations: (pv.metadata?.annotations as Record<string, string>) || {},
    };
  });
}

export async function getPersistentVolumeClaims(
  yaml: string,
  namespace?: string
): Promise<PersistentVolumeClaimInfo[]> {
  const kc = createKubeConfig(yaml);
  const api = kc.makeApiClient(k8s.CoreV1Api);

  const [pvcResponse, podResponse] = await Promise.all([
    namespace
      ? api.listNamespacedPersistentVolumeClaim({ namespace })
      : api.listPersistentVolumeClaimForAllNamespaces(),
    namespace
      ? api.listNamespacedPod({ namespace })
      : api.listPodForAllNamespaces(),
  ]);

  // Build a map of PVC name -> pod names that use it
  const pvcPodMap = new Map<string, string[]>();
  for (const pod of podResponse.items) {
    const podName = pod.metadata?.name || "";
    const podNs = pod.metadata?.namespace || "";
    for (const vol of pod.spec?.volumes || []) {
      if (vol.persistentVolumeClaim?.claimName) {
        const key = `${podNs}/${vol.persistentVolumeClaim.claimName}`;
        const existing = pvcPodMap.get(key) || [];
        existing.push(podName);
        pvcPodMap.set(key, existing);
      }
    }
  }

  return pvcResponse.items.map((pvc) => {
    const pvcName = pvc.metadata?.name || "";
    const pvcNs = pvc.metadata?.namespace || "";
    const requestedStorage = pvc.spec?.resources?.requests?.storage || "";
    const actualStorage = pvc.status?.capacity?.storage || "";

    return {
      name: pvcName,
      namespace: pvcNs,
      status: pvc.status?.phase || "Unknown",
      storageClassName: pvc.spec?.storageClassName || "",
      requestedCapacity: formatCapacity(requestedStorage),
      actualCapacity: formatCapacity(actualStorage),
      accessModes: pvc.spec?.accessModes || [],
      volumeName: pvc.spec?.volumeName || "",
      usedByPods: pvcPodMap.get(`${pvcNs}/${pvcName}`) || [],
      age: pvc.metadata?.creationTimestamp
        ? calculateAge(new Date(pvc.metadata.creationTimestamp))
        : "",
      labels: (pvc.metadata?.labels as Record<string, string>) || {},
      annotations: (pvc.metadata?.annotations as Record<string, string>) || {},
    };
  });
}

export async function getStorageClasses(
  yaml: string
): Promise<StorageClassInfo[]> {
  const kc = createKubeConfig(yaml);
  const api = kc.makeApiClient(k8s.StorageV1Api);
  const response = await api.listStorageClass();

  return response.items
    .map((sc) => ({
      name: sc.metadata?.name || "",
      provisioner: sc.provisioner || "",
      reclaimPolicy: sc.reclaimPolicy || "Delete",
      volumeBindingMode: sc.volumeBindingMode || "Immediate",
      isDefault:
        sc.metadata?.annotations?.[
          "storageclass.kubernetes.io/is-default-class"
        ] === "true",
      allowVolumeExpansion: sc.allowVolumeExpansion || false,
      parameters: (sc.parameters as Record<string, string>) || {},
      age: sc.metadata?.creationTimestamp
        ? calculateAge(new Date(sc.metadata.creationTimestamp))
        : "",
    }))
    .sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function createLogStream(
  yaml: string,
  namespace: string,
  pod: string,
  container: string,
  tailLines = 50
): { stream: Readable; abort: () => void } {
  const kc = createKubeConfig(yaml);
  const log = new k8s.Log(kc);
  const passthrough = new Readable({ read() {} });
  let abortController: AbortController | null = null;

  const writable = new Writable({
    write(chunk: Buffer, _encoding: string, callback: () => void) {
      passthrough.push(chunk);
      callback();
    },
  });

  log
    .log(namespace, pod, container, writable, {
      follow: true,
      tailLines,
    })
    .then((ac: AbortController) => {
      abortController = ac;
    })
    .catch(() => {
      passthrough.push(null);
    });

  return {
    stream: passthrough,
    abort: () => {
      abortController?.abort();
      passthrough.push(null);
    },
  };
}

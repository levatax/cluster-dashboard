import * as k8s from "@kubernetes/client-node";
import { EventEmitter } from "node:events";
import {
  createKubeConfig,
  mapV1NodeToNodeInfo,
  mapV1PodToPodInfo,
  mapV1DeploymentToDeploymentInfo,
  mapV1EventToClusterEventInfo,
  parseCpuValue,
  parseMemoryValue,
} from "@/lib/kubernetes";
import type {
  NodeInfo,
  PodInfo,
  DeploymentInfo,
  ClusterEventInfo,
  ClusterHealthSummary,
} from "@/lib/types";

// --- Types ---

export type WatchableResource = "nodes" | "pods" | "deployments" | "events";

export interface WatchEvent<T = unknown> {
  resource: WatchableResource;
  action: "ADDED" | "MODIFIED" | "DELETED" | "SNAPSHOT";
  data: T;
  resourceVersion?: string;
  isHealthSnapshot?: boolean;
}

interface Subscriber {
  resources: Set<WatchableResource>;
  callback: (event: WatchEvent) => void;
}

interface ResourceWatch {
  abortController: AbortController | null;
  resourceVersion: string;
  refCount: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  backoffMs: number;
  cache: Map<string, unknown>;
}

interface ClusterWatchGroup {
  kubeconfigYaml: string;
  kc: k8s.KubeConfig;
  emitter: EventEmitter;
  watches: Map<WatchableResource, ResourceWatch>;
  subscribers: Set<Subscriber>;
  healthDebounceTimer: ReturnType<typeof setTimeout> | null;
  namespace: string | undefined;
}

// --- Constants ---

const WATCH_PATHS: Record<WatchableResource, { cluster: string; namespaced: string }> = {
  nodes: { cluster: "/api/v1/nodes", namespaced: "/api/v1/nodes" }, // nodes are always cluster-scoped
  pods: { cluster: "/api/v1/pods", namespaced: "/api/v1/namespaces/{ns}/pods" },
  deployments: {
    cluster: "/apis/apps/v1/deployments",
    namespaced: "/apis/apps/v1/namespaces/{ns}/deployments",
  },
  events: { cluster: "/api/v1/events", namespaced: "/api/v1/namespaces/{ns}/events" },
};

const MIN_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;
const HEALTH_DEBOUNCE_MS = 500;

// --- Mapper helpers ---

function mapObject(resource: WatchableResource, obj: unknown): { key: string; mapped: unknown } | null {
  try {
    switch (resource) {
      case "nodes": {
        const mapped = mapV1NodeToNodeInfo(obj as k8s.V1Node);
        return { key: mapped.name, mapped };
      }
      case "pods": {
        const mapped = mapV1PodToPodInfo(obj as k8s.V1Pod);
        return { key: `${mapped.namespace}/${mapped.name}`, mapped };
      }
      case "deployments": {
        const mapped = mapV1DeploymentToDeploymentInfo(obj as k8s.V1Deployment);
        return { key: `${mapped.namespace}/${mapped.name}`, mapped };
      }
      case "events": {
        const mapped = mapV1EventToClusterEventInfo(obj as k8s.CoreV1Event);
        return { key: `${mapped.namespace}/${mapped.name}`, mapped };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function getResourceVersion(obj: unknown): string {
  return ((obj as { metadata?: { resourceVersion?: string } })?.metadata?.resourceVersion) || "";
}

// --- Watch Manager ---

export class KubernetesWatchManager {
  private groups = new Map<string, ClusterWatchGroup>();
  private shutdownRequested = false;

  /**
   * Generate a group key combining clusterId and namespace scope
   */
  private groupKey(clusterId: string, namespace: string | undefined): string {
    return namespace ? `${clusterId}:${namespace}` : `${clusterId}:*`;
  }

  /**
   * Subscribe to watch events for a cluster's resources.
   * Returns an unsubscribe function.
   */
  async subscribe(
    clusterId: string,
    kubeconfigYaml: string,
    resources: WatchableResource[],
    namespace: string | undefined,
    callback: (event: WatchEvent) => void
  ): Promise<() => void> {
    const key = this.groupKey(clusterId, namespace);
    let group = this.groups.get(key);

    if (!group) {
      const kc = createKubeConfig(kubeconfigYaml);
      group = {
        kubeconfigYaml,
        kc,
        emitter: new EventEmitter(),
        watches: new Map(),
        subscribers: new Set(),
        healthDebounceTimer: null,
        namespace,
      };
      group.emitter.setMaxListeners(100);
      this.groups.set(key, group);
    }

    const subscriber: Subscriber = {
      resources: new Set(resources),
      callback,
    };
    group.subscribers.add(subscriber);

    // Start watches for requested resources, send snapshots
    for (const resource of resources) {
      let rw = group.watches.get(resource);
      if (!rw) {
        rw = {
          abortController: null,
          resourceVersion: "",
          refCount: 0,
          reconnectTimer: null,
          backoffMs: MIN_BACKOFF_MS,
          cache: new Map(),
        };
        group.watches.set(resource, rw);
      }

      rw.refCount++;

      if (rw.refCount === 1) {
        // First subscriber for this resource — start the watch
        this.startWatch(key, resource);
      } else {
        // Send cached snapshot to new subscriber
        this.sendSnapshot(resource, rw, callback);
      }
    }

    // Return unsubscribe
    return () => {
      this.unsubscribe(key, subscriber);
    };
  }

  private unsubscribe(groupKey: string, subscriber: Subscriber): void {
    const group = this.groups.get(groupKey);
    if (!group) return;

    group.subscribers.delete(subscriber);

    for (const resource of subscriber.resources) {
      const rw = group.watches.get(resource);
      if (!rw) continue;
      rw.refCount--;

      if (rw.refCount <= 0) {
        // No more subscribers — abort the watch
        this.stopWatch(rw);
        group.watches.delete(resource);
      }
    }

    // Clean up group if no subscribers left
    if (group.subscribers.size === 0) {
      if (group.healthDebounceTimer) clearTimeout(group.healthDebounceTimer);
      this.groups.delete(groupKey);
    }
  }

  private stopWatch(rw: ResourceWatch): void {
    if (rw.abortController) {
      try { rw.abortController.abort(); } catch { /* ignore */ }
      rw.abortController = null;
    }
    if (rw.reconnectTimer) {
      clearTimeout(rw.reconnectTimer);
      rw.reconnectTimer = null;
    }
  }

  private sendSnapshot(
    resource: WatchableResource,
    rw: ResourceWatch,
    callback: (event: WatchEvent) => void
  ): void {
    const items = Array.from(rw.cache.values());
    callback({
      resource,
      action: "SNAPSHOT",
      data: items,
      resourceVersion: rw.resourceVersion,
    });
  }

  private async startWatch(groupKey: string, resource: WatchableResource): Promise<void> {
    if (this.shutdownRequested) return;

    const group = this.groups.get(groupKey);
    if (!group) return;

    const rw = group.watches.get(resource);
    if (!rw) return;

    const pathTemplate =
      resource === "nodes" || !group.namespace
        ? WATCH_PATHS[resource].cluster
        : WATCH_PATHS[resource].namespaced;

    const path = pathTemplate.replace("{ns}", group.namespace || "");

    const watcher = new k8s.Watch(group.kc);
    const queryParams: Record<string, string | boolean> = {
      allowWatchBookmarks: true,
    };
    if (rw.resourceVersion) {
      queryParams.resourceVersion = rw.resourceVersion;
    }

    try {
      const ac = await watcher.watch(
        path,
        queryParams,
        (phase: string, apiObj: unknown, watchObj?: { metadata?: { resourceVersion?: string } }) => {
          // Update resourceVersion from watchObj if available
          const rv = watchObj?.metadata?.resourceVersion || getResourceVersion(apiObj);
          if (rv) rw.resourceVersion = rv;

          if (phase === "BOOKMARK") {
            // Only update resourceVersion, don't emit
            return;
          }

          const action = phase as "ADDED" | "MODIFIED" | "DELETED";
          const result = mapObject(resource, apiObj);
          if (!result) return;

          const { key, mapped } = result;

          // Update cache
          if (action === "DELETED") {
            rw.cache.delete(key);
          } else {
            rw.cache.set(key, mapped);
          }

          // Emit to subscribers
          const event: WatchEvent = {
            resource,
            action,
            data: mapped,
            resourceVersion: rv,
          };

          for (const sub of group.subscribers) {
            if (sub.resources.has(resource)) {
              try { sub.callback(event); } catch { /* ignore subscriber errors */ }
            }
          }

          // Schedule health recomputation
          this.scheduleHealthUpdate(groupKey);

          // Reset backoff on successful event
          rw.backoffMs = MIN_BACKOFF_MS;
        },
        (err: unknown) => {
          // Watch ended — schedule reconnect
          rw.abortController = null;

          if (this.shutdownRequested) return;
          if (!this.groups.has(groupKey)) return;

          const is410 =
            err && typeof err === "object" &&
            "statusCode" in err && (err as { statusCode: number }).statusCode === 410;

          if (is410) {
            // 410 Gone — reset resourceVersion and restart (re-list)
            rw.resourceVersion = "";
            rw.cache.clear();
          }

          // Exponential backoff reconnect
          rw.reconnectTimer = setTimeout(() => {
            rw.reconnectTimer = null;
            this.startWatch(groupKey, resource);
          }, rw.backoffMs);

          rw.backoffMs = Math.min(rw.backoffMs * 2, MAX_BACKOFF_MS);
        }
      );

      rw.abortController = ac;
    } catch {
      // Connection failed — schedule reconnect
      if (!this.shutdownRequested && this.groups.has(groupKey)) {
        rw.reconnectTimer = setTimeout(() => {
          rw.reconnectTimer = null;
          this.startWatch(groupKey, resource);
        }, rw.backoffMs);
        rw.backoffMs = Math.min(rw.backoffMs * 2, MAX_BACKOFF_MS);
      }
    }
  }

  private scheduleHealthUpdate(groupKey: string): void {
    const group = this.groups.get(groupKey);
    if (!group) return;

    if (group.healthDebounceTimer) clearTimeout(group.healthDebounceTimer);

    group.healthDebounceTimer = setTimeout(() => {
      group.healthDebounceTimer = null;
      this.computeAndEmitHealth(groupKey);
    }, HEALTH_DEBOUNCE_MS);
  }

  private async computeAndEmitHealth(groupKey: string): Promise<void> {
    const group = this.groups.get(groupKey);
    if (!group) return;

    const nodeWatch = group.watches.get("nodes");
    const podWatch = group.watches.get("pods");
    const deploymentWatch = group.watches.get("deployments");
    const eventWatch = group.watches.get("events");

    const nodes = nodeWatch ? (Array.from(nodeWatch.cache.values()) as NodeInfo[]) : [];
    const pods = podWatch ? (Array.from(podWatch.cache.values()) as PodInfo[]) : [];
    const deployments = deploymentWatch
      ? (Array.from(deploymentWatch.cache.values()) as DeploymentInfo[])
      : [];
    const events = eventWatch
      ? (Array.from(eventWatch.cache.values()) as ClusterEventInfo[])
      : [];

    const nodesReady = nodes.filter((n) => n.status === "Ready").length;
    const podsRunning = pods.filter((p) => p.status === "Running").length;
    const podsPending = pods.filter((p) => p.status === "Pending").length;
    const podsFailed = pods.filter((p) => p.status === "Failed").length;

    const deploymentsHealthy = deployments.filter((d) => {
      const [readyStr, desiredStr] = d.ready.split("/");
      const ready = parseInt(readyStr, 10);
      const desired = parseInt(desiredStr, 10);
      return desired > 0 && ready >= desired;
    }).length;

    const warningEvents = events.filter((e) => e.type === "Warning").length;

    let cpuAvgPercent: number | null = null;
    let memoryAvgPercent: number | null = null;
    let metricsAvailable = false;

    try {
      const metricsClient = new k8s.Metrics(group.kc);
      const nodeMetrics = await metricsClient.getNodeMetrics();
      if (nodeMetrics.items.length > 0) {
        metricsAvailable = true;
        // Fetch raw node capacity (NodeInfo.memory is pre-formatted, not parseable)
        const coreApi = group.kc.makeApiClient(k8s.CoreV1Api);
        const nodeList = await coreApi.listNode();
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

    const health: ClusterHealthSummary = {
      nodesReady,
      nodesTotal: nodes.length,
      podsRunning,
      podsPending,
      podsFailed,
      podsTotal: pods.length,
      deploymentsHealthy,
      deploymentsTotal: deployments.length,
      warningEvents,
      cpuAvgPercent,
      memoryAvgPercent,
      metricsAvailable,
    };

    const event: WatchEvent<ClusterHealthSummary> = {
      resource: "nodes",
      action: "SNAPSHOT",
      data: health,
      isHealthSnapshot: true,
    };

    for (const sub of group.subscribers) {
      try { sub.callback({ ...event, resource: "nodes" }); } catch { /* ignore */ }
    }
  }

  /**
   * Gracefully shutdown all watches
   */
  shutdown(): void {
    this.shutdownRequested = true;
    for (const [, group] of this.groups) {
      if (group.healthDebounceTimer) clearTimeout(group.healthDebounceTimer);
      for (const [, rw] of group.watches) {
        this.stopWatch(rw);
      }
    }
    this.groups.clear();
  }
}

// --- Singleton (survives HMR) ---

const globalWithWatchManager = globalThis as typeof globalThis & {
  _kubernetesWatchManager?: KubernetesWatchManager;
};

export function getWatchManager(): KubernetesWatchManager {
  if (!globalWithWatchManager._kubernetesWatchManager) {
    globalWithWatchManager._kubernetesWatchManager = new KubernetesWatchManager();
  }
  return globalWithWatchManager._kubernetesWatchManager;
}

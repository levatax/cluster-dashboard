import type {
  DeploymentInfo,
  ServiceInfo,
  IngressInfo,
  PersistentVolumeClaimInfo,
  PodInfo,
  DiscoveredApplication,
} from "@/lib/types";

const SYSTEM_NAMESPACES = new Set(["kube-system", "kube-public", "kube-node-lease"]);

function getAppName(labels: Record<string, string>, fallbackName: string): string {
  return (
    labels["app.kubernetes.io/instance"] ||
    labels["app.kubernetes.io/name"] ||
    labels["app"] ||
    fallbackName
  );
}

function labelsMatch(a: Record<string, string>, b: Record<string, string>): boolean {
  const appKeys = ["app.kubernetes.io/instance", "app.kubernetes.io/name", "app"];
  for (const key of appKeys) {
    if (a[key] && b[key] && a[key] === b[key]) return true;
  }
  return false;
}

function selectorOverlaps(
  selector: Record<string, string>,
  labels: Record<string, string>
): boolean {
  if (Object.keys(selector).length === 0) return false;
  return Object.entries(selector).every(([k, v]) => labels[k] === v);
}

function computeStatus(
  deployments: DeploymentInfo[]
): DiscoveredApplication["status"] {
  if (deployments.length === 0) return "Unknown";

  const allHealthy = deployments.every((d) => {
    const desired = d.replicas;
    return desired > 0 && d.available >= desired;
  });
  if (allHealthy) return "Healthy";

  const anyProgressing = deployments.some((d) =>
    d.conditions.some((c) => c.type === "Progressing" && c.status === "True" && c.reason !== "NewReplicaSetAvailable")
  );
  if (anyProgressing) return "Progressing";

  return "Degraded";
}

function findOldestAge(ages: string[]): string {
  if (ages.length === 0) return "";

  const parseAge = (age: string): number => {
    if (!age) return 0;
    const match = age.match(/^(\d+)([ymdhm])$/);
    if (!match) return 0;
    const [, numStr, unit] = match;
    const num = parseInt(numStr, 10);
    const multipliers: Record<string, number> = { y: 365 * 24 * 60, d: 24 * 60, h: 60, m: 1 };
    return num * (multipliers[unit] || 1);
  };

  let oldest = ages[0];
  let oldestVal = parseAge(ages[0]);
  for (let i = 1; i < ages.length; i++) {
    const val = parseAge(ages[i]);
    if (val > oldestVal) {
      oldest = ages[i];
      oldestVal = val;
    }
  }
  return oldest;
}

export function discoverApplications(
  deployments: DeploymentInfo[],
  services: ServiceInfo[],
  ingresses: IngressInfo[],
  pvcs: PersistentVolumeClaimInfo[],
  pods: PodInfo[],
  includeSystemNamespaces = false
): DiscoveredApplication[] {
  // Group by app name + namespace
  const appMap = new Map<string, {
    name: string;
    namespace: string;
    groupingSource: DiscoveredApplication["groupingSource"];
    deployments: DeploymentInfo[];
    services: ServiceInfo[];
    ingresses: IngressInfo[];
    pvcs: PersistentVolumeClaimInfo[];
    pods: PodInfo[];
  }>();

  // Step 1: Seed groups from deployments
  for (const dep of deployments) {
    if (!includeSystemNamespaces && SYSTEM_NAMESPACES.has(dep.namespace)) continue;

    const appName = getAppName(dep.labels, dep.name);
    const key = `${dep.namespace}/${appName}`;
    const hasLabel = dep.labels["app.kubernetes.io/instance"] || dep.labels["app.kubernetes.io/name"] || dep.labels["app"];
    const groupingSource: DiscoveredApplication["groupingSource"] = hasLabel ? "label" : "name-convention";

    if (!appMap.has(key)) {
      appMap.set(key, {
        name: appName,
        namespace: dep.namespace,
        groupingSource,
        deployments: [],
        services: [],
        ingresses: [],
        pvcs: [],
        pods: [],
      });
    }
    appMap.get(key)!.deployments.push(dep);
  }

  // Step 2: Match services
  for (const svc of services) {
    if (!includeSystemNamespaces && SYSTEM_NAMESPACES.has(svc.namespace)) continue;

    let matched = false;

    // Try label match first
    for (const [, group] of appMap) {
      if (group.namespace !== svc.namespace) continue;
      if (labelsMatch(svc.labels, group.deployments[0]?.labels || {})) {
        group.services.push(svc);
        matched = true;
        break;
      }
    }

    if (matched) continue;

    // Try selector overlap with deployment selectors
    for (const [, group] of appMap) {
      if (group.namespace !== svc.namespace) continue;
      for (const dep of group.deployments) {
        if (selectorOverlaps(svc.selector, dep.labels) || selectorOverlaps(dep.selector, svc.labels)) {
          group.services.push(svc);
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
  }

  // Step 3: Match ingresses
  for (const ing of ingresses) {
    if (!includeSystemNamespaces && SYSTEM_NAMESPACES.has(ing.namespace)) continue;

    let matched = false;

    // Try label match
    for (const [, group] of appMap) {
      if (group.namespace !== ing.namespace) continue;
      if (labelsMatch(ing.labels, group.deployments[0]?.labels || {})) {
        group.ingresses.push(ing);
        matched = true;
        break;
      }
    }

    if (matched) continue;

    // Try matching by backend service name
    for (const rule of ing.rules) {
      for (const path of rule.paths) {
        const backendSvcName = path.backend.split(":")[0];
        for (const [, group] of appMap) {
          if (group.namespace !== ing.namespace) continue;
          if (group.services.some((s) => s.name === backendSvcName)) {
            group.ingresses.push(ing);
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
      if (matched) break;
    }
  }

  // Step 4: Match PVCs
  for (const pvc of pvcs) {
    if (!includeSystemNamespaces && SYSTEM_NAMESPACES.has(pvc.namespace)) continue;

    let matched = false;

    // Try label match
    for (const [, group] of appMap) {
      if (group.namespace !== pvc.namespace) continue;
      if (labelsMatch(pvc.labels, group.deployments[0]?.labels || {})) {
        group.pvcs.push(pvc);
        matched = true;
        break;
      }
    }

    if (matched) continue;

    // Try by usedByPods matching pods owned by a grouped deployment
    if (pvc.usedByPods.length > 0) {
      for (const [, group] of appMap) {
        if (group.namespace !== pvc.namespace) continue;
        // Check if any of the PVC's pods match deployment selectors
        const matchingPods = pods.filter(
          (p) => p.namespace === pvc.namespace && pvc.usedByPods.includes(p.name)
        );
        for (const pod of matchingPods) {
          for (const dep of group.deployments) {
            if (selectorOverlaps(dep.selector, pod.labels)) {
              group.pvcs.push(pvc);
              matched = true;
              break;
            }
          }
          if (matched) break;
        }
        if (matched) break;
      }
    }
  }

  // Step 5: Match pods
  for (const pod of pods) {
    if (!includeSystemNamespaces && SYSTEM_NAMESPACES.has(pod.namespace)) continue;

    for (const [, group] of appMap) {
      if (group.namespace !== pod.namespace) continue;
      for (const dep of group.deployments) {
        if (selectorOverlaps(dep.selector, pod.labels)) {
          group.pods.push(pod);
          break;
        }
      }
    }
  }

  // Step 6: Build result
  const apps: DiscoveredApplication[] = [];
  for (const [, group] of appMap) {
    const allImages = new Set<string>();
    for (const pod of group.pods) {
      for (const container of pod.containers) {
        if (container.image) allImages.add(container.image);
      }
    }

    const allHosts: string[] = [];
    for (const ing of group.ingresses) {
      for (const rule of ing.rules) {
        if (rule.host && rule.host !== "*") allHosts.push(rule.host);
      }
    }

    const managedBy =
      group.deployments[0]?.labels["app.kubernetes.io/managed-by"] || undefined;

    const allAges = [
      ...group.deployments.map((d) => d.age),
      ...group.services.map((s) => s.age),
    ];

    apps.push({
      name: group.name,
      namespace: group.namespace,
      groupingSource: group.groupingSource,
      status: computeStatus(group.deployments),
      images: Array.from(allImages),
      age: findOldestAge(allAges),
      hosts: allHosts,
      managedBy,
      deployments: group.deployments,
      services: group.services,
      ingresses: group.ingresses,
      pvcs: group.pvcs,
      pods: group.pods,
      resourceCounts: {
        deployments: group.deployments.length,
        services: group.services.length,
        ingresses: group.ingresses.length,
        pvcs: group.pvcs.length,
        pods: group.pods.length,
      },
    });
  }

  // Sort: Degraded first, then by name
  apps.sort((a, b) => {
    const statusOrder = { Degraded: 0, Progressing: 1, Healthy: 2, Unknown: 3 };
    const diff = statusOrder[a.status] - statusOrder[b.status];
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });

  return apps;
}

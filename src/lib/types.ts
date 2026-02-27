export interface NodeInfo {
  name: string;
  status: string;
  roles: string[];
  age: string;
  version: string;
  os: string;
  arch: string;
  cpu: string;
  memory: string;
  internalIP: string;
  schedulable: boolean;
}

export interface ClusterInfo {
  name: string;
  server: string;
  context: string;
  version: string;
  nodeCount: number;
}

export interface PodInfo {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  restarts: number;
  age: string;
  node: string;
  ip: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  containers: {
    name: string;
    image: string;
    ready: boolean;
    restarts: number;
    state: string;
    reason: string;
  }[];
}

export interface DeploymentInfo {
  name: string;
  namespace: string;
  ready: string;
  replicas: number;
  upToDate: number;
  available: number;
  age: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  selector: Record<string, string>;
  conditions: { type: string; status: string; reason: string; message: string }[];
}

export interface ServiceInfo {
  name: string;
  namespace: string;
  type: string;
  clusterIP: string;
  externalIP: string;
  ports: string;
  age: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  selector: Record<string, string>;
}

export interface IngressInfo {
  name: string;
  namespace: string;
  hosts: string;
  addresses: string;
  ports: string;
  ingressClass: string;
  age: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  rules: { host: string; paths: { path: string; backend: string }[] }[];
}

export interface NodeMetricsInfo {
  name: string;
  cpuUsage: number;
  cpuCapacity: number;
  cpuPercent: number;
  memoryUsage: number;
  memoryCapacity: number;
  memoryPercent: number;
}

export interface PodMetricsInfo {
  name: string;
  namespace: string;
  cpuUsage: number;
  memoryUsage: number;
  containers: { name: string; cpuUsage: number; memoryUsage: number }[];
}

export interface ClusterEventInfo {
  name: string;
  namespace: string;
  type: string;
  reason: string;
  message: string;
  involvedObject: string;
  source: string;
  count: number;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  age: string;
}

export interface ClusterHealthSummary {
  nodesReady: number;
  nodesTotal: number;
  podsRunning: number;
  podsPending: number;
  podsFailed: number;
  podsTotal: number;
  deploymentsHealthy: number;
  deploymentsTotal: number;
  warningEvents: number;
  cpuAvgPercent: number | null;
  memoryAvgPercent: number | null;
  metricsAvailable: boolean;
}

export interface PersistentVolumeInfo {
  name: string;
  status: string;
  capacity: string;
  capacityBytes: number;
  accessModes: string[];
  reclaimPolicy: string;
  storageClassName: string;
  claimRef: string;
  volumeMode: string;
  reason: string;
  age: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
}

export interface PersistentVolumeClaimInfo {
  name: string;
  namespace: string;
  status: string;
  storageClassName: string;
  requestedCapacity: string;
  actualCapacity: string;
  accessModes: string[];
  volumeName: string;
  usedByPods: string[];
  age: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
}

export interface StorageClassInfo {
  name: string;
  provisioner: string;
  reclaimPolicy: string;
  volumeBindingMode: string;
  isDefault: boolean;
  allowVolumeExpansion: boolean;
  parameters: Record<string, string>;
  age: string;
}

export interface DiscoveredApplication {
  name: string;
  namespace: string;
  groupingSource: "label" | "selector-match" | "name-convention";
  status: "Healthy" | "Degraded" | "Progressing" | "Unknown";
  images: string[];
  age: string;
  hosts: string[];
  managedBy?: string;
  deployments: DeploymentInfo[];
  services: ServiceInfo[];
  ingresses: IngressInfo[];
  pvcs: PersistentVolumeClaimInfo[];
  pods: PodInfo[];
  resourceCounts: {
    deployments: number;
    services: number;
    ingresses: number;
    pvcs: number;
    pods: number;
  };
}

import type { CatalogApp } from "../types";

export const memcached: CatalogApp = {
  id: "memcached",
  name: "Memcached",
  description: "High-performance, distributed memory object caching system",
  icon: "⚡",
  category: "caching",
  version: "1.6",
  versions: ["1.6"],
  website: "https://memcached.org",
  configFields: [
    { name: "namespace", label: "Namespace", type: "text", default: "default", required: true },
    { name: "releaseName", label: "Release Name", type: "text", default: "memcached", required: true },
    { name: "replicas", label: "Replicas", type: "number", default: 1, min: 1, max: 5 },
    { name: "memoryLimit", label: "Memory Limit (Mi)", type: "number", default: 64, min: 32, max: 2048 },
    { name: "version", label: "Version", type: "select", default: "1.6", options: [
      { label: "1.6", value: "1.6" },
    ]},
  ],
  helmChart: { repo: "bitnami", repoUrl: "https://charts.bitnami.com/bitnami", chart: "memcached" },
  generateManifests: (config) => {
    const ns = config.namespace as string || "default";
    const name = config.releaseName as string || "memcached";
    const version = config.version as string || "1.6";
    const replicas = config.replicas as number || 1;
    const memoryLimit = config.memoryLimit as number || 64;

    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: cluster-dashboard
spec:
  replicas: ${replicas}
  selector:
    matchLabels:
      app: ${name}
  template:
    metadata:
      labels:
        app: ${name}
        managed-by: cluster-dashboard
    spec:
      containers:
        - name: memcached
          image: memcached:${version}
          args: ["-m", "${memoryLimit}"]
          ports:
            - containerPort: 11211
          resources:
            requests:
              memory: "${memoryLimit}Mi"
              cpu: "100m"
            limits:
              memory: "${memoryLimit * 2}Mi"
              cpu: "250m"
---
apiVersion: v1
kind: Service
metadata:
  name: ${name}
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: cluster-dashboard
spec:
  type: ClusterIP
  ports:
    - port: 11211
      targetPort: 11211
  selector:
    app: ${name}`;
  },
};

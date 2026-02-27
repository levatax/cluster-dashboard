import type { CatalogApp } from "../types";

export const redis: CatalogApp = {
  id: "redis",
  name: "Redis",
  description: "In-memory data structure store used as database, cache, and message broker",
  icon: "🔴",
  category: "caching",
  version: "7.2",
  versions: ["7.2", "7.0", "6.2"],
  website: "https://redis.io",
  configFields: [
    { name: "namespace", label: "Namespace", type: "text", default: "default", required: true },
    { name: "releaseName", label: "Release Name", type: "text", default: "redis", required: true },
    { name: "password", label: "Password", type: "password", default: "", required: true, placeholder: "Enter a secure password" },
    { name: "replicas", label: "Replicas", type: "number", default: 1, min: 1, max: 5 },
    { name: "storageSize", label: "Storage Size (Gi)", type: "number", default: 5, min: 1, max: 100 },
    { name: "version", label: "Version", type: "select", default: "7.2", options: [
      { label: "7.2", value: "7.2" }, { label: "7.0", value: "7.0" },
      { label: "6.2", value: "6.2" },
    ]},
  ],
  helmChart: { repo: "bitnami", repoUrl: "https://charts.bitnami.com/bitnami", chart: "redis" },
  generateManifests: (config) => {
    const ns = config.namespace as string || "default";
    const name = config.releaseName as string || "redis";
    const password = config.password as string || "changeme";
    const storage = config.storageSize as number || 5;
    const version = config.version as string || "7.2";
    const replicas = config.replicas as number || 1;

    return `apiVersion: v1
kind: Secret
metadata:
  name: ${name}-secret
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: cluster-dashboard
type: Opaque
stringData:
  REDIS_PASSWORD: "${password}"
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${name}-data
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: cluster-dashboard
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: ${storage}Gi
---
apiVersion: apps/v1
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
        - name: redis
          image: redis:${version}
          args: ["--requirepass", "$(REDIS_PASSWORD)"]
          ports:
            - containerPort: 6379
          envFrom:
            - secretRef:
                name: ${name}-secret
          volumeMounts:
            - name: data
              mountPath: /data
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "250m"
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: ${name}-data
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
    - port: 6379
      targetPort: 6379
  selector:
    app: ${name}`;
  },
};

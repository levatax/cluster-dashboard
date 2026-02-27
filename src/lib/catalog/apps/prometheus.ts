import type { CatalogApp } from "../types";

export const prometheus: CatalogApp = {
  id: "prometheus",
  name: "Prometheus",
  description: "Open-source monitoring and alerting toolkit for cloud-native environments",
  icon: "🔥",
  category: "monitoring",
  version: "2.51",
  versions: ["2.51", "2.50"],
  website: "https://prometheus.io",
  configFields: [
    { name: "namespace", label: "Namespace", type: "text", default: "monitoring", required: true },
    { name: "releaseName", label: "Release Name", type: "text", default: "prometheus", required: true },
    { name: "replicas", label: "Replicas", type: "number", default: 1, min: 1, max: 3 },
    { name: "storageSize", label: "Storage Size (Gi)", type: "number", default: 20, min: 5, max: 500 },
    { name: "retentionDays", label: "Retention (days)", type: "number", default: 15, min: 1, max: 90 },
    { name: "version", label: "Version", type: "select", default: "2.51", options: [
      { label: "2.51", value: "2.51" }, { label: "2.50", value: "2.50" },
    ]},
  ],
  helmChart: { repo: "prometheus-community", repoUrl: "https://prometheus-community.github.io/helm-charts", chart: "prometheus" },
  generateManifests: (config) => {
    const ns = config.namespace as string || "monitoring";
    const name = config.releaseName as string || "prometheus";
    const storage = config.storageSize as number || 20;
    const version = config.version as string || "2.51";
    const replicas = config.replicas as number || 1;
    const retentionDays = config.retentionDays as number || 15;

    return `apiVersion: v1
kind: Namespace
metadata:
  name: ${ns}
  labels:
    app: ${name}
    managed-by: cluster-dashboard
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ${name}
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: cluster-dashboard
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: ${name}-config
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: cluster-dashboard
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    scrape_configs:
      - job_name: "prometheus"
        static_configs:
          - targets: ["localhost:9090"]
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
      serviceAccountName: ${name}
      containers:
        - name: prometheus
          image: prom/prometheus:v${version}.0
          args:
            - "--config.file=/etc/prometheus/prometheus.yml"
            - "--storage.tsdb.path=/prometheus"
            - "--storage.tsdb.retention.time=${retentionDays}d"
          ports:
            - containerPort: 9090
          volumeMounts:
            - name: config
              mountPath: /etc/prometheus
            - name: data
              mountPath: /prometheus
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
      volumes:
        - name: config
          configMap:
            name: ${name}-config
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
    - port: 9090
      targetPort: 9090
  selector:
    app: ${name}`;
  },
};

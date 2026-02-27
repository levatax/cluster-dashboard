import type { CatalogApp } from "../types";

export const grafana: CatalogApp = {
  id: "grafana",
  name: "Grafana",
  description: "Open-source analytics and interactive visualization web application",
  icon: "📊",
  category: "monitoring",
  version: "10.4",
  versions: ["10.4", "10.3"],
  website: "https://grafana.com",
  configFields: [
    { name: "namespace", label: "Namespace", type: "text", default: "monitoring", required: true },
    { name: "releaseName", label: "Release Name", type: "text", default: "grafana", required: true },
    { name: "password", label: "Admin Password", type: "password", default: "", required: true, placeholder: "Enter admin password" },
    { name: "replicas", label: "Replicas", type: "number", default: 1, min: 1, max: 3 },
    { name: "storageSize", label: "Storage Size (Gi)", type: "number", default: 5, min: 1, max: 100 },
    { name: "version", label: "Version", type: "select", default: "10.4", options: [
      { label: "10.4", value: "10.4" }, { label: "10.3", value: "10.3" },
    ]},
  ],
  helmChart: { repo: "grafana", repoUrl: "https://grafana.github.io/helm-charts", chart: "grafana" },
  generateManifests: (config) => {
    const ns = config.namespace as string || "monitoring";
    const name = config.releaseName as string || "grafana";
    const password = config.password as string || "admin";
    const storage = config.storageSize as number || 5;
    const version = config.version as string || "10.4";
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
  GF_SECURITY_ADMIN_USER: "admin"
  GF_SECURITY_ADMIN_PASSWORD: "${password}"
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
        - name: grafana
          image: grafana/grafana:${version}.0
          ports:
            - containerPort: 3000
          envFrom:
            - secretRef:
                name: ${name}-secret
          volumeMounts:
            - name: data
              mountPath: /var/lib/grafana
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
    - port: 3000
      targetPort: 3000
  selector:
    app: ${name}`;
  },
};

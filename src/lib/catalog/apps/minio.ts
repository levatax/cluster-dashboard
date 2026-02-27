import type { CatalogApp } from "../types";

export const minio: CatalogApp = {
  id: "minio",
  name: "MinIO",
  description: "High-performance, S3-compatible object storage for cloud-native workloads",
  icon: "📦",
  category: "storage",
  version: "2024.2",
  versions: ["2024.2"],
  website: "https://min.io",
  configFields: [
    { name: "namespace", label: "Namespace", type: "text", default: "default", required: true },
    { name: "releaseName", label: "Release Name", type: "text", default: "minio", required: true },
    { name: "password", label: "Root Password", type: "password", default: "", required: true, placeholder: "Enter root password (min 8 chars)" },
    { name: "rootUser", label: "Root User", type: "text", default: "minioadmin" },
    { name: "replicas", label: "Replicas", type: "number", default: 1, min: 1, max: 4 },
    { name: "storageSize", label: "Storage Size (Gi)", type: "number", default: 20, min: 5, max: 1000 },
    { name: "version", label: "Version", type: "select", default: "2024.2", options: [
      { label: "2024.2", value: "2024.2" },
    ]},
  ],
  helmChart: { repo: "minio", repoUrl: "https://charts.min.io", chart: "minio" },
  generateManifests: (config) => {
    const ns = config.namespace as string || "default";
    const name = config.releaseName as string || "minio";
    const password = config.password as string || "changeme";
    const rootUser = config.rootUser as string || "minioadmin";
    const storage = config.storageSize as number || 20;
    const version = config.version as string || "2024.2";
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
  MINIO_ROOT_USER: "${rootUser}"
  MINIO_ROOT_PASSWORD: "${password}"
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
        - name: minio
          image: minio/minio:RELEASE.${version}-01-01T00-00-00Z
          args: ["server", "/data", "--console-address", ":9001"]
          ports:
            - name: api
              containerPort: 9000
            - name: console
              containerPort: 9001
          envFrom:
            - secretRef:
                name: ${name}-secret
          volumeMounts:
            - name: data
              mountPath: /data
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
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
    - name: api
      port: 9000
      targetPort: 9000
    - name: console
      port: 9001
      targetPort: 9001
  selector:
    app: ${name}`;
  },
};

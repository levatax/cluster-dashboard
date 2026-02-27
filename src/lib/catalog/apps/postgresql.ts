import type { CatalogApp } from "../types";

export const postgresql: CatalogApp = {
  id: "postgresql",
  name: "PostgreSQL",
  description: "Powerful, open source object-relational database system",
  icon: "🐘",
  category: "databases",
  version: "16.2",
  versions: ["16.2", "15.6", "14.11", "13.14"],
  website: "https://www.postgresql.org",
  configFields: [
    { name: "namespace", label: "Namespace", type: "text", default: "default", required: true },
    { name: "releaseName", label: "Release Name", type: "text", default: "postgresql", required: true },
    { name: "password", label: "Root Password", type: "password", default: "", required: true, placeholder: "Enter a secure password" },
    { name: "database", label: "Database Name", type: "text", default: "mydb" },
    { name: "username", label: "Username", type: "text", default: "postgres" },
    { name: "replicas", label: "Replicas", type: "number", default: 1, min: 1, max: 5 },
    { name: "storageSize", label: "Storage Size (Gi)", type: "number", default: 10, min: 1, max: 500 },
    { name: "version", label: "Version", type: "select", default: "16.2", options: [
      { label: "16.2", value: "16.2" }, { label: "15.6", value: "15.6" },
      { label: "14.11", value: "14.11" }, { label: "13.14", value: "13.14" },
    ]},
  ],
  helmChart: { repo: "bitnami", repoUrl: "https://charts.bitnami.com/bitnami", chart: "postgresql" },
  generateManifests: (config) => {
    const ns = config.namespace as string || "default";
    const name = config.releaseName as string || "postgresql";
    const password = config.password as string || "changeme";
    const database = config.database as string || "mydb";
    const username = config.username as string || "postgres";
    const storage = config.storageSize as number || 10;
    const version = config.version as string || "16.2";
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
  POSTGRES_PASSWORD: "${password}"
  POSTGRES_USER: "${username}"
  POSTGRES_DB: "${database}"
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
        - name: postgresql
          image: postgres:${version}
          ports:
            - containerPort: 5432
          envFrom:
            - secretRef:
                name: ${name}-secret
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
              subPath: pgdata
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
    - port: 5432
      targetPort: 5432
  selector:
    app: ${name}`;
  },
};

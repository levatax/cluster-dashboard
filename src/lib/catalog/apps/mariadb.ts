import type { CatalogApp } from "../types";

export const mariadb: CatalogApp = {
  id: "mariadb",
  name: "MariaDB",
  description: "Community-developed fork of MySQL with enhanced features and performance",
  icon: "🦭",
  category: "databases",
  version: "11.3",
  versions: ["11.3", "11.2", "10.11"],
  website: "https://mariadb.org",
  configFields: [
    { name: "namespace", label: "Namespace", type: "text", default: "default", required: true },
    { name: "releaseName", label: "Release Name", type: "text", default: "mariadb", required: true },
    { name: "password", label: "Root Password", type: "password", default: "", required: true, placeholder: "Enter a secure password" },
    { name: "database", label: "Database Name", type: "text", default: "mydb" },
    { name: "username", label: "Username", type: "text", default: "mariadb" },
    { name: "replicas", label: "Replicas", type: "number", default: 1, min: 1, max: 5 },
    { name: "storageSize", label: "Storage Size (Gi)", type: "number", default: 10, min: 1, max: 500 },
    { name: "version", label: "Version", type: "select", default: "11.3", options: [
      { label: "11.3", value: "11.3" }, { label: "11.2", value: "11.2" },
      { label: "10.11", value: "10.11" },
    ]},
  ],
  helmChart: { repo: "bitnami", repoUrl: "https://charts.bitnami.com/bitnami", chart: "mariadb" },
  generateManifests: (config) => {
    const ns = config.namespace as string || "default";
    const name = config.releaseName as string || "mariadb";
    const password = config.password as string || "changeme";
    const database = config.database as string || "mydb";
    const username = config.username as string || "mariadb";
    const storage = config.storageSize as number || 10;
    const version = config.version as string || "11.3";
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
  MARIADB_ROOT_PASSWORD: "${password}"
  MARIADB_USER: "${username}"
  MARIADB_PASSWORD: "${password}"
  MARIADB_DATABASE: "${database}"
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
        - name: mariadb
          image: mariadb:${version}
          ports:
            - containerPort: 3306
          envFrom:
            - secretRef:
                name: ${name}-secret
          volumeMounts:
            - name: data
              mountPath: /var/lib/mysql
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
    - port: 3306
      targetPort: 3306
  selector:
    app: ${name}`;
  },
};

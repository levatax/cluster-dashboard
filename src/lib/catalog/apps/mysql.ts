import type { CatalogApp } from "../types";

export const mysql: CatalogApp = {
  id: "mysql",
  name: "MySQL",
  description: "The world's most popular open source relational database",
  icon: "🐬",
  category: "databases",
  version: "8.3",
  versions: ["8.3", "8.0", "5.7"],
  website: "https://www.mysql.com",
  configFields: [
    { name: "namespace", label: "Namespace", type: "text", default: "default", required: true },
    { name: "releaseName", label: "Release Name", type: "text", default: "mysql", required: true },
    { name: "password", label: "Root Password", type: "password", default: "", required: true, placeholder: "Enter a secure password" },
    { name: "database", label: "Database Name", type: "text", default: "mydb" },
    { name: "username", label: "Username", type: "text", default: "mysql" },
    { name: "replicas", label: "Replicas", type: "number", default: 1, min: 1, max: 5 },
    { name: "storageSize", label: "Storage Size (Gi)", type: "number", default: 10, min: 1, max: 500 },
    { name: "version", label: "Version", type: "select", default: "8.3", options: [
      { label: "8.3", value: "8.3" }, { label: "8.0", value: "8.0" },
      { label: "5.7", value: "5.7" },
    ]},
  ],
  helmChart: { repo: "bitnami", repoUrl: "https://charts.bitnami.com/bitnami", chart: "mysql" },
  generateManifests: (config) => {
    const ns = config.namespace as string || "default";
    const name = config.releaseName as string || "mysql";
    const password = config.password as string || "changeme";
    const database = config.database as string || "mydb";
    const username = config.username as string || "mysql";
    const storage = config.storageSize as number || 10;
    const version = config.version as string || "8.3";
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
  MYSQL_ROOT_PASSWORD: "${password}"
  MYSQL_USER: "${username}"
  MYSQL_PASSWORD: "${password}"
  MYSQL_DATABASE: "${database}"
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
        - name: mysql
          image: mysql:${version}
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

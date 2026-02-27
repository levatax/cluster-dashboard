import type { CatalogApp } from "../types";

export const mongodb: CatalogApp = {
  id: "mongodb",
  name: "MongoDB",
  description: "General purpose, document-based, distributed NoSQL database",
  icon: "🍃",
  category: "databases",
  version: "7.0",
  versions: ["7.0", "6.0", "5.0"],
  website: "https://www.mongodb.com",
  configFields: [
    { name: "namespace", label: "Namespace", type: "text", default: "default", required: true },
    { name: "releaseName", label: "Release Name", type: "text", default: "mongodb", required: true },
    { name: "password", label: "Root Password", type: "password", default: "", required: true, placeholder: "Enter a secure password" },
    { name: "database", label: "Database Name", type: "text", default: "mydb" },
    { name: "username", label: "Username", type: "text", default: "mongo" },
    { name: "replicas", label: "Replicas", type: "number", default: 1, min: 1, max: 5 },
    { name: "storageSize", label: "Storage Size (Gi)", type: "number", default: 10, min: 1, max: 500 },
    { name: "version", label: "Version", type: "select", default: "7.0", options: [
      { label: "7.0", value: "7.0" }, { label: "6.0", value: "6.0" },
      { label: "5.0", value: "5.0" },
    ]},
  ],
  helmChart: { repo: "bitnami", repoUrl: "https://charts.bitnami.com/bitnami", chart: "mongodb" },
  generateManifests: (config) => {
    const ns = config.namespace as string || "default";
    const name = config.releaseName as string || "mongodb";
    const password = config.password as string || "changeme";
    const database = config.database as string || "mydb";
    const username = config.username as string || "mongo";
    const storage = config.storageSize as number || 10;
    const version = config.version as string || "7.0";
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
  MONGO_INITDB_ROOT_USERNAME: "${username}"
  MONGO_INITDB_ROOT_PASSWORD: "${password}"
  MONGO_INITDB_DATABASE: "${database}"
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
        - name: mongodb
          image: mongo:${version}
          ports:
            - containerPort: 27017
          envFrom:
            - secretRef:
                name: ${name}-secret
          volumeMounts:
            - name: data
              mountPath: /data/db
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
    - port: 27017
      targetPort: 27017
  selector:
    app: ${name}`;
  },
};

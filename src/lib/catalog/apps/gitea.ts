import type { CatalogApp } from "../types";

export const gitea: CatalogApp = {
  id: "gitea",
  name: "Gitea",
  description: "Lightweight, self-hosted Git service for code hosting and collaboration",
  icon: "🍵",
  category: "ci-cd",
  version: "1.21",
  versions: ["1.21", "1.20"],
  website: "https://gitea.io",
  configFields: [
    { name: "namespace", label: "Namespace", type: "text", default: "default", required: true },
    { name: "releaseName", label: "Release Name", type: "text", default: "gitea", required: true },
    { name: "password", label: "Admin Password", type: "password", default: "", required: true, placeholder: "Enter admin password" },
    { name: "username", label: "Admin Username", type: "text", default: "gitea_admin" },
    { name: "replicas", label: "Replicas", type: "number", default: 1, min: 1, max: 3 },
    { name: "storageSize", label: "Storage Size (Gi)", type: "number", default: 10, min: 1, max: 200 },
    { name: "version", label: "Version", type: "select", default: "1.21", options: [
      { label: "1.21", value: "1.21" }, { label: "1.20", value: "1.20" },
    ]},
  ],
  helmChart: { repo: "gitea", repoUrl: "https://dl.gitea.io/charts", chart: "gitea" },
  generateManifests: (config) => {
    const ns = config.namespace as string || "default";
    const name = config.releaseName as string || "gitea";
    const password = config.password as string || "changeme";
    const username = config.username as string || "gitea_admin";
    const storage = config.storageSize as number || 10;
    const version = config.version as string || "1.21";
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
  GITEA__security__INSTALL_LOCK: "true"
  GITEA__security__SECRET_KEY: "${password}"
  GITEA_ADMIN_USERNAME: "${username}"
  GITEA_ADMIN_PASSWORD: "${password}"
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
        - name: gitea
          image: gitea/gitea:${version}
          ports:
            - name: http
              containerPort: 3000
            - name: ssh
              containerPort: 22
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
    - name: http
      port: 3000
      targetPort: 3000
    - name: ssh
      port: 22
      targetPort: 22
  selector:
    app: ${name}`;
  },
};

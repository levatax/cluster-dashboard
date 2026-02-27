import type { CatalogApp } from "../types";

export const keycloak: CatalogApp = {
  id: "keycloak",
  name: "Keycloak",
  description: "Open source identity and access management for modern applications and services",
  icon: "🔐",
  category: "security",
  version: "24.0",
  versions: ["24.0", "23.0"],
  website: "https://www.keycloak.org",
  configFields: [
    { name: "namespace", label: "Namespace", type: "text", default: "default", required: true },
    { name: "releaseName", label: "Release Name", type: "text", default: "keycloak", required: true },
    { name: "password", label: "Admin Password", type: "password", default: "", required: true, placeholder: "Enter admin password" },
    { name: "username", label: "Admin Username", type: "text", default: "admin" },
    { name: "replicas", label: "Replicas", type: "number", default: 1, min: 1, max: 3 },
    { name: "version", label: "Version", type: "select", default: "24.0", options: [
      { label: "24.0", value: "24.0" }, { label: "23.0", value: "23.0" },
    ]},
  ],
  helmChart: { repo: "bitnami", repoUrl: "https://charts.bitnami.com/bitnami", chart: "keycloak" },
  generateManifests: (config) => {
    const ns = config.namespace as string || "default";
    const name = config.releaseName as string || "keycloak";
    const password = config.password as string || "changeme";
    const username = config.username as string || "admin";
    const version = config.version as string || "24.0";
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
  KEYCLOAK_ADMIN: "${username}"
  KEYCLOAK_ADMIN_PASSWORD: "${password}"
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
        - name: keycloak
          image: quay.io/keycloak/keycloak:${version}.0
          args: ["start-dev"]
          ports:
            - containerPort: 8080
          envFrom:
            - secretRef:
                name: ${name}-secret
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
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
    - port: 8080
      targetPort: 8080
  selector:
    app: ${name}`;
  },
};

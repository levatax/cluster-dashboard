import type { CatalogApp } from "../types";

export const traefik: CatalogApp = {
  id: "traefik",
  name: "Traefik",
  description: "Cloud-native application proxy and ingress controller",
  icon: "🔀",
  category: "networking",
  version: "3.0",
  versions: ["3.0", "2.11"],
  website: "https://traefik.io",
  configFields: [
    { name: "namespace", label: "Namespace", type: "text", default: "default", required: true },
    { name: "releaseName", label: "Release Name", type: "text", default: "traefik", required: true },
    { name: "replicas", label: "Replicas", type: "number", default: 1, min: 1, max: 5 },
    { name: "enableDashboard", label: "Enable Dashboard", type: "toggle", default: true },
    { name: "version", label: "Version", type: "select", default: "3.0", options: [
      { label: "3.0", value: "3.0" }, { label: "2.11", value: "2.11" },
    ]},
  ],
  helmChart: { repo: "traefik", repoUrl: "https://traefik.github.io/charts", chart: "traefik" },
  generateManifests: (config) => {
    const ns = config.namespace as string || "default";
    const name = config.releaseName as string || "traefik";
    const version = config.version as string || "3.0";
    const replicas = config.replicas as number || 1;
    const enableDashboard = config.enableDashboard !== false;

    return `apiVersion: v1
kind: ServiceAccount
metadata:
  name: ${name}
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: cluster-dashboard
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
        - name: traefik
          image: traefik:${version}
          args:
            - "--providers.kubernetesingress"
            - "--entrypoints.web.address=:80"
            - "--entrypoints.websecure.address=:443"${enableDashboard ? `
            - "--api.dashboard=true"
            - "--api.insecure=true"` : ""}
          ports:
            - name: web
              containerPort: 80
            - name: websecure
              containerPort: 443${enableDashboard ? `
            - name: dashboard
              containerPort: 8080` : ""}
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "250m"
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
  type: LoadBalancer
  ports:
    - name: web
      port: 80
      targetPort: 80
    - name: websecure
      port: 443
      targetPort: 443
  selector:
    app: ${name}${enableDashboard ? `
---
apiVersion: v1
kind: Service
metadata:
  name: ${name}-dashboard
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: cluster-dashboard
spec:
  type: ClusterIP
  ports:
    - name: dashboard
      port: 8080
      targetPort: 8080
  selector:
    app: ${name}` : ""}`;
  },
};

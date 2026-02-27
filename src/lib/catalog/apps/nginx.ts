import type { CatalogApp } from "../types";

export const nginx: CatalogApp = {
  id: "nginx",
  name: "Nginx",
  description: "High performance web server, reverse proxy, and load balancer",
  icon: "🌐",
  category: "web-servers",
  version: "1.25",
  versions: ["1.25", "1.24"],
  website: "https://nginx.org",
  configFields: [
    { name: "namespace", label: "Namespace", type: "text", default: "default", required: true },
    { name: "releaseName", label: "Release Name", type: "text", default: "nginx", required: true },
    { name: "replicas", label: "Replicas", type: "number", default: 1, min: 1, max: 10 },
    { name: "version", label: "Version", type: "select", default: "1.25", options: [
      { label: "1.25", value: "1.25" }, { label: "1.24", value: "1.24" },
    ]},
  ],
  helmChart: { repo: "bitnami", repoUrl: "https://charts.bitnami.com/bitnami", chart: "nginx" },
  generateManifests: (config) => {
    const ns = config.namespace as string || "default";
    const name = config.releaseName as string || "nginx";
    const version = config.version as string || "1.25";
    const replicas = config.replicas as number || 1;

    return `apiVersion: apps/v1
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
        - name: nginx
          image: nginx:${version}
          ports:
            - containerPort: 80
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"
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
    - port: 80
      targetPort: 80
  selector:
    app: ${name}`;
  },
};

import type { CatalogApp } from "../types";

export const metricsServer: CatalogApp = {
  id: "metrics-server",
  name: "Metrics Server",
  description: "Scalable and efficient source of container resource metrics for Kubernetes",
  icon: "📈",
  category: "monitoring",
  version: "0.7",
  versions: ["0.7", "0.6"],
  website: "https://github.com/kubernetes-sigs/metrics-server",
  configFields: [
    { name: "namespace", label: "Namespace", type: "text", default: "kube-system", required: true },
    { name: "releaseName", label: "Release Name", type: "text", default: "metrics-server", required: true },
    { name: "replicas", label: "Replicas", type: "number", default: 1, min: 1, max: 3 },
    { name: "version", label: "Version", type: "select", default: "0.7", options: [
      { label: "0.7", value: "0.7" }, { label: "0.6", value: "0.6" },
    ]},
  ],
  helmChart: { repo: "metrics-server", repoUrl: "https://kubernetes-sigs.github.io/metrics-server", chart: "metrics-server" },
  generateManifests: (config) => {
    const ns = config.namespace as string || "kube-system";
    const name = config.releaseName as string || "metrics-server";
    const version = config.version as string || "0.7";
    const replicas = config.replicas as number || 1;

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
        - name: metrics-server
          image: registry.k8s.io/metrics-server/metrics-server:v${version}.0
          args:
            - "--cert-dir=/tmp"
            - "--secure-port=10250"
            - "--kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname"
            - "--kubelet-use-node-status-port"
            - "--metric-resolution=15s"
          ports:
            - name: https
              containerPort: 10250
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
    - name: https
      port: 443
      targetPort: 10250
  selector:
    app: ${name}`;
  },
};

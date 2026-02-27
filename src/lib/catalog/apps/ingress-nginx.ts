import type { CatalogApp } from "../types";

export const ingressNginx: CatalogApp = {
  id: "ingress-nginx",
  name: "Ingress-NGINX Controller",
  description: "Production-grade ingress controller for Kubernetes using NGINX",
  icon: "🚪",
  category: "networking",
  version: "1.10",
  versions: ["1.10", "1.9"],
  website: "https://kubernetes.github.io/ingress-nginx",
  configFields: [
    { name: "namespace", label: "Namespace", type: "text", default: "ingress-nginx", required: true },
    { name: "releaseName", label: "Release Name", type: "text", default: "ingress-nginx", required: true },
    { name: "replicas", label: "Replicas", type: "number", default: 1, min: 1, max: 5 },
    { name: "version", label: "Version", type: "select", default: "1.10", options: [
      { label: "1.10", value: "1.10" }, { label: "1.9", value: "1.9" },
    ]},
  ],
  helmChart: { repo: "ingress-nginx", repoUrl: "https://kubernetes.github.io/ingress-nginx", chart: "ingress-nginx" },
  generateManifests: (config) => {
    const ns = config.namespace as string || "ingress-nginx";
    const name = config.releaseName as string || "ingress-nginx";
    const version = config.version as string || "1.10";
    const replicas = config.replicas as number || 1;

    return `apiVersion: v1
kind: Namespace
metadata:
  name: ${ns}
  labels:
    app: ${name}
    managed-by: cluster-dashboard
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ${name}
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: cluster-dashboard
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: ${name}-controller
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: cluster-dashboard
data: {}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}-controller
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
        - name: controller
          image: registry.k8s.io/ingress-nginx/controller:v${version}.0
          args:
            - /nginx-ingress-controller
            - --configmap=$(POD_NAMESPACE)/${name}-controller
          env:
            - name: POD_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
          ports:
            - name: http
              containerPort: 80
            - name: https
              containerPort: 443
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
  name: ${name}-controller
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: cluster-dashboard
spec:
  type: LoadBalancer
  ports:
    - name: http
      port: 80
      targetPort: 80
    - name: https
      port: 443
      targetPort: 443
  selector:
    app: ${name}`;
  },
};

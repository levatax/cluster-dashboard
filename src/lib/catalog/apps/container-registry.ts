import type { CatalogApp } from "../types";

export const containerRegistry: CatalogApp = {
  id: "container-registry",
  name: "Container Registry",
  description: "Lightweight Docker registry (registry:2) for storing and distributing container images in-cluster",
  icon: "📦",
  category: "ci-cd",
  version: "2",
  versions: ["2"],
  website: "https://hub.docker.com/_/registry",
  configFields: [
    { name: "namespace", label: "Namespace", type: "text", default: "registry", required: true },
    { name: "releaseName", label: "Release Name", type: "text", default: "container-registry", required: true },
    { name: "storageSize", label: "Storage Size (Gi)", type: "number", default: 20, min: 5, max: 500 },
    { name: "nodePort", label: "Node Port", type: "number", default: 30500, description: "NodePort so nodes can pull images (required for in-cluster builds)", min: 30000, max: 32767 },
  ],
  generateManifests: (config) => {
    const ns = config.namespace as string || "registry";
    const name = config.releaseName as string || "container-registry";
    const storage = config.storageSize as number || 20;
    const nodePort = config.nodePort as number || 0;

    const serviceSpec = nodePort > 0
      ? `  type: NodePort
  ports:
    - name: registry
      port: 5000
      targetPort: 5000
      nodePort: ${nodePort}`
      : `  type: ClusterIP
  ports:
    - name: registry
      port: 5000
      targetPort: 5000`;

    return `apiVersion: v1
kind: Namespace
metadata:
  name: ${ns}
  labels:
    managed-by: cluster-dashboard
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
  replicas: 1
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
        - name: registry
          image: registry:2
          ports:
            - name: registry
              containerPort: 5000
          volumeMounts:
            - name: data
              mountPath: /var/lib/registry
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "256Mi"
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
${serviceSpec}
  selector:
    app: ${name}`;
  },
};

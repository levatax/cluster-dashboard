import type { CatalogApp } from "../types";

export const harbor: CatalogApp = {
  id: "harbor",
  name: "Harbor",
  description: "Open source cloud-native container registry with security and management features",
  icon: "⚓",
  category: "ci-cd",
  version: "2.10",
  versions: ["2.10", "2.9"],
  website: "https://goharbor.io",
  configFields: [
    { name: "namespace", label: "Namespace", type: "text", default: "default", required: true },
    { name: "releaseName", label: "Release Name", type: "text", default: "harbor", required: true },
    { name: "password", label: "Admin Password", type: "password", default: "", required: true, placeholder: "Enter admin password" },
    { name: "replicas", label: "Replicas", type: "number", default: 1, min: 1, max: 3 },
    { name: "storageSize", label: "Storage Size (Gi)", type: "number", default: 50, min: 10, max: 1000 },
    { name: "version", label: "Version", type: "select", default: "2.10", options: [
      { label: "2.10", value: "2.10" }, { label: "2.9", value: "2.9" },
    ]},
  ],
  helmChart: { repo: "harbor", repoUrl: "https://helm.goharbor.io", chart: "harbor" },
  generateManifests: (config) => {
    const ns = config.namespace as string || "default";
    const name = config.releaseName as string || "harbor";
    const password = config.password as string || "changeme";
    const storage = config.storageSize as number || 50;
    const version = config.version as string || "2.10";
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
  HARBOR_ADMIN_PASSWORD: "${password}"
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${name}-registry
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
  name: ${name}-core
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: cluster-dashboard
spec:
  replicas: ${replicas}
  selector:
    matchLabels:
      app: ${name}
      component: core
  template:
    metadata:
      labels:
        app: ${name}
        component: core
        managed-by: cluster-dashboard
    spec:
      containers:
        - name: harbor-core
          image: goharbor/harbor-core:v${version}.0
          ports:
            - containerPort: 8080
          envFrom:
            - secretRef:
                name: ${name}-secret
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}-registry
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: cluster-dashboard
spec:
  replicas: ${replicas}
  selector:
    matchLabels:
      app: ${name}
      component: registry
  template:
    metadata:
      labels:
        app: ${name}
        component: registry
        managed-by: cluster-dashboard
    spec:
      containers:
        - name: harbor-registry
          image: goharbor/registry-photon:v${version}.0
          ports:
            - containerPort: 5000
          volumeMounts:
            - name: registry-data
              mountPath: /storage
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
      volumes:
        - name: registry-data
          persistentVolumeClaim:
            claimName: ${name}-registry
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
      port: 80
      targetPort: 8080
  selector:
    app: ${name}
    component: core`;
  },
};

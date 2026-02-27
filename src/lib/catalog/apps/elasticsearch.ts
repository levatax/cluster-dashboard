import type { CatalogApp } from "../types";

export const elasticsearch: CatalogApp = {
  id: "elasticsearch",
  name: "Elasticsearch",
  description: "Distributed, RESTful search and analytics engine",
  icon: "🔍",
  category: "databases",
  version: "8.13",
  versions: ["8.13", "8.12"],
  website: "https://www.elastic.co/elasticsearch",
  configFields: [
    { name: "namespace", label: "Namespace", type: "text", default: "default", required: true },
    { name: "releaseName", label: "Release Name", type: "text", default: "elasticsearch", required: true },
    { name: "password", label: "Password", type: "password", default: "", required: true, placeholder: "Enter elastic user password" },
    { name: "replicas", label: "Replicas", type: "number", default: 1, min: 1, max: 5 },
    { name: "storageSize", label: "Storage Size (Gi)", type: "number", default: 20, min: 5, max: 500 },
    { name: "version", label: "Version", type: "select", default: "8.13", options: [
      { label: "8.13", value: "8.13" }, { label: "8.12", value: "8.12" },
    ]},
  ],
  helmChart: { repo: "elastic", repoUrl: "https://helm.elastic.co", chart: "elasticsearch" },
  generateManifests: (config) => {
    const ns = config.namespace as string || "default";
    const name = config.releaseName as string || "elasticsearch";
    const password = config.password as string || "changeme";
    const storage = config.storageSize as number || 20;
    const version = config.version as string || "8.13";
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
  ELASTIC_PASSWORD: "${password}"
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
      initContainers:
        - name: sysctl
          image: busybox
          command: ["sysctl", "-w", "vm.max_map_count=262144"]
          securityContext:
            privileged: true
      containers:
        - name: elasticsearch
          image: docker.elastic.co/elasticsearch/elasticsearch:${version}.0
          ports:
            - containerPort: 9200
            - containerPort: 9300
          env:
            - name: discovery.type
              value: single-node
            - name: xpack.security.enabled
              value: "true"
            - name: ELASTIC_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: ${name}-secret
                  key: ELASTIC_PASSWORD
          volumeMounts:
            - name: data
              mountPath: /usr/share/elasticsearch/data
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
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
    - port: 9200
      targetPort: 9200
  selector:
    app: ${name}`;
  },
};

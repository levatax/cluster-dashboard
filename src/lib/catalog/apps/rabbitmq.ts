import type { CatalogApp } from "../types";

export const rabbitmq: CatalogApp = {
  id: "rabbitmq",
  name: "RabbitMQ",
  description: "Open-source message broker supporting multiple messaging protocols",
  icon: "🐰",
  category: "message-queues",
  version: "3.13",
  versions: ["3.13", "3.12"],
  website: "https://www.rabbitmq.com",
  configFields: [
    { name: "namespace", label: "Namespace", type: "text", default: "default", required: true },
    { name: "releaseName", label: "Release Name", type: "text", default: "rabbitmq", required: true },
    { name: "password", label: "Admin Password", type: "password", default: "", required: true, placeholder: "Enter admin password" },
    { name: "username", label: "Username", type: "text", default: "rabbitmq" },
    { name: "replicas", label: "Replicas", type: "number", default: 1, min: 1, max: 5 },
    { name: "storageSize", label: "Storage Size (Gi)", type: "number", default: 10, min: 1, max: 100 },
    { name: "version", label: "Version", type: "select", default: "3.13", options: [
      { label: "3.13", value: "3.13" }, { label: "3.12", value: "3.12" },
    ]},
  ],
  helmChart: { repo: "bitnami", repoUrl: "https://charts.bitnami.com/bitnami", chart: "rabbitmq" },
  generateManifests: (config) => {
    const ns = config.namespace as string || "default";
    const name = config.releaseName as string || "rabbitmq";
    const password = config.password as string || "changeme";
    const username = config.username as string || "rabbitmq";
    const storage = config.storageSize as number || 10;
    const version = config.version as string || "3.13";
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
  RABBITMQ_DEFAULT_USER: "${username}"
  RABBITMQ_DEFAULT_PASS: "${password}"
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
        - name: rabbitmq
          image: rabbitmq:${version}-management
          ports:
            - name: amqp
              containerPort: 5672
            - name: management
              containerPort: 15672
          envFrom:
            - secretRef:
                name: ${name}-secret
          volumeMounts:
            - name: data
              mountPath: /var/lib/rabbitmq
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
    - name: amqp
      port: 5672
      targetPort: 5672
    - name: management
      port: 15672
      targetPort: 15672
  selector:
    app: ${name}`;
  },
};

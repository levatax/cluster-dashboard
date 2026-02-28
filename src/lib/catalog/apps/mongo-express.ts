import type { CatalogApp } from "../types";

export const mongoExpress: CatalogApp = {
  id: "mongo-express",
  name: "Mongo Express",
  description: "Web-based MongoDB admin interface for viewing and managing databases",
  icon: "🔎",
  category: "databases",
  version: "1.0",
  versions: ["1.0"],
  website: "https://github.com/mongo-express/mongo-express",
  configFields: [
    { name: "namespace", label: "Namespace", type: "text", default: "default", required: true },
    { name: "releaseName", label: "Release Name", type: "text", default: "mongo-express", required: true },
    { name: "mongoHost", label: "MongoDB Host", type: "text", default: "mongodb", required: true, description: "Service name or hostname of your MongoDB instance" },
    { name: "mongoPort", label: "MongoDB Port", type: "number", default: 27017, min: 1, max: 65535 },
    { name: "mongoUsername", label: "MongoDB Username", type: "text", default: "mongo", required: true },
    { name: "mongoPassword", label: "MongoDB Password", type: "password", default: "", required: true, placeholder: "MongoDB root/admin password" },
    { name: "basicAuthUsername", label: "Web UI Username", type: "text", default: "admin", description: "Basic auth username for the web interface" },
    { name: "basicAuthPassword", label: "Web UI Password", type: "password", default: "", required: true, placeholder: "Password for the web interface" },
    { name: "version", label: "Version", type: "select", default: "1.0.2-20-alpine3.19", options: [
      { label: "1.0.2-20 (Alpine)", value: "1.0.2-20-alpine3.19" },
      { label: "1.0.2-18 (Alpine)", value: "1.0.2-18-alpine3.19" },
      { label: "latest", value: "latest" },
    ]},
  ],
  generateManifests: (config) => {
    const ns = config.namespace as string || "default";
    const name = config.releaseName as string || "mongo-express";
    const mongoHost = config.mongoHost as string || "mongodb";
    const mongoPort = config.mongoPort as number || 27017;
    const mongoUsername = config.mongoUsername as string || "mongo";
    const mongoPassword = config.mongoPassword as string || "";
    const basicAuthUsername = config.basicAuthUsername as string || "admin";
    const basicAuthPassword = config.basicAuthPassword as string || "";
    const version = config.version as string || "1.0.2-20-alpine3.19";

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
  ME_CONFIG_MONGODB_ADMINUSERNAME: "${mongoUsername}"
  ME_CONFIG_MONGODB_ADMINPASSWORD: "${mongoPassword}"
  ME_CONFIG_BASICAUTH_USERNAME: "${basicAuthUsername}"
  ME_CONFIG_BASICAUTH_PASSWORD: "${basicAuthPassword}"
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
        - name: mongo-express
          image: mongo-express:${version}
          ports:
            - containerPort: 8081
          env:
            - name: ME_CONFIG_MONGODB_SERVER
              value: "${mongoHost}"
            - name: ME_CONFIG_MONGODB_PORT
              value: "${mongoPort}"
          envFrom:
            - secretRef:
                name: ${name}-secret
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
    - port: 8081
      targetPort: 8081
  selector:
    app: ${name}`;
  },
};

import type { CatalogApp } from "../types";

export const wordpress: CatalogApp = {
  id: "wordpress",
  name: "WordPress",
  description: "The world's most popular content management system, requires MySQL",
  icon: "📝",
  category: "web-servers",
  version: "6.5",
  versions: ["6.5", "6.4"],
  website: "https://wordpress.org",
  configFields: [
    { name: "namespace", label: "Namespace", type: "text", default: "default", required: true },
    { name: "releaseName", label: "Release Name", type: "text", default: "wordpress", required: true },
    { name: "password", label: "Admin Password", type: "password", default: "", required: true, placeholder: "Enter WordPress admin password" },
    { name: "adminUser", label: "Admin Username", type: "text", default: "admin" },
    { name: "dbHost", label: "MySQL Host", type: "text", default: "mysql", description: "Hostname of existing MySQL service" },
    { name: "dbName", label: "Database Name", type: "text", default: "wordpress" },
    { name: "dbUser", label: "Database User", type: "text", default: "wordpress" },
    { name: "dbPassword", label: "Database Password", type: "password", default: "", required: true, placeholder: "MySQL user password" },
    { name: "replicas", label: "Replicas", type: "number", default: 1, min: 1, max: 5 },
    { name: "storageSize", label: "Storage Size (Gi)", type: "number", default: 10, min: 1, max: 100 },
    { name: "version", label: "Version", type: "select", default: "6.5", options: [
      { label: "6.5", value: "6.5" }, { label: "6.4", value: "6.4" },
    ]},
  ],
  helmChart: { repo: "bitnami", repoUrl: "https://charts.bitnami.com/bitnami", chart: "wordpress" },
  generateManifests: (config) => {
    const ns = config.namespace as string || "default";
    const name = config.releaseName as string || "wordpress";
    const password = config.password as string || "changeme";
    const adminUser = config.adminUser as string || "admin";
    const dbHost = config.dbHost as string || "mysql";
    const dbName = config.dbName as string || "wordpress";
    const dbUser = config.dbUser as string || "wordpress";
    const dbPassword = config.dbPassword as string || "changeme";
    const storage = config.storageSize as number || 10;
    const version = config.version as string || "6.5";
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
  WORDPRESS_ADMIN_USER: "${adminUser}"
  WORDPRESS_ADMIN_PASSWORD: "${password}"
  WORDPRESS_DB_HOST: "${dbHost}"
  WORDPRESS_DB_NAME: "${dbName}"
  WORDPRESS_DB_USER: "${dbUser}"
  WORDPRESS_DB_PASSWORD: "${dbPassword}"
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
        - name: wordpress
          image: wordpress:${version}
          ports:
            - containerPort: 80
          env:
            - name: WORDPRESS_DB_HOST
              valueFrom:
                secretKeyRef:
                  name: ${name}-secret
                  key: WORDPRESS_DB_HOST
            - name: WORDPRESS_DB_NAME
              valueFrom:
                secretKeyRef:
                  name: ${name}-secret
                  key: WORDPRESS_DB_NAME
            - name: WORDPRESS_DB_USER
              valueFrom:
                secretKeyRef:
                  name: ${name}-secret
                  key: WORDPRESS_DB_USER
            - name: WORDPRESS_DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: ${name}-secret
                  key: WORDPRESS_DB_PASSWORD
          volumeMounts:
            - name: data
              mountPath: /var/www/html
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "250m"
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
    - port: 80
      targetPort: 80
  selector:
    app: ${name}`;
  },
};

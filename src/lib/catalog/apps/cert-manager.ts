import type { CatalogApp } from "../types";

export const certManager: CatalogApp = {
  id: "cert-manager",
  name: "Cert-Manager",
  description: "Automatically provision and manage TLS certificates in Kubernetes",
  icon: "🔒",
  category: "security",
  version: "1.14",
  versions: ["1.14", "1.13"],
  website: "https://cert-manager.io",
  configFields: [
    { name: "namespace", label: "Namespace", type: "text", default: "cert-manager", required: true },
    { name: "releaseName", label: "Release Name", type: "text", default: "cert-manager", required: true },
    { name: "replicas", label: "Replicas", type: "number", default: 1, min: 1, max: 3 },
    { name: "installCRDs", label: "Install CRDs", type: "toggle", default: true, description: "Install Custom Resource Definitions (required for first install)" },
    { name: "version", label: "Version", type: "select", default: "1.14", options: [
      { label: "1.14", value: "1.14" }, { label: "1.13", value: "1.13" },
    ]},
  ],
  helmChart: { repo: "jetstack", repoUrl: "https://charts.jetstack.io", chart: "cert-manager", defaultValues: { installCRDs: true } },
  generateManifests: (config) => {
    const ns = config.namespace as string || "cert-manager";
    const name = config.releaseName as string || "cert-manager";
    const version = config.version as string || "1.14";
    const replicas = config.replicas as number || 1;
    const installCRDs = config.installCRDs !== false;

    return `# Note: Cert-Manager requires CRDs to be installed.
# For production use, install via Helm with --set installCRDs=true
# or apply CRDs from: https://github.com/cert-manager/cert-manager/releases/download/v${version}.0/cert-manager.crds.yaml
---
apiVersion: v1
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
        - name: cert-manager
          image: quay.io/jetstack/cert-manager-controller:v${version}.0
          args:
            - "--v=2"
            - "--cluster-resource-namespace=$(POD_NAMESPACE)"
            - "--leader-election-namespace=$(POD_NAMESPACE)"
          env:
            - name: POD_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
          ports:
            - containerPort: 9402
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"${installCRDs ? `
---
# Webhook Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}-webhook
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: cluster-dashboard
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${name}-webhook
  template:
    metadata:
      labels:
        app: ${name}-webhook
        managed-by: cluster-dashboard
    spec:
      serviceAccountName: ${name}
      containers:
        - name: webhook
          image: quay.io/jetstack/cert-manager-webhook:v${version}.0
          args:
            - "--v=2"
            - "--secure-port=10250"
          ports:
            - containerPort: 10250
          resources:
            requests:
              memory: "32Mi"
              cpu: "25m"
            limits:
              memory: "64Mi"
              cpu: "50m"` : ""}
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
    - port: 9402
      targetPort: 9402
  selector:
    app: ${name}`;
  },
};

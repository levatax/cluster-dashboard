export interface EnvVar {
  key: string;
  value: string;
  isSecret: boolean;
}

export interface ManifestConfig {
  name: string;
  namespace: string;
  image: string;
  port: number;
  replicas: number;
  env?: Record<string, string>;
  envVars?: EnvVar[];
  ingress?: {
    enabled: boolean;
    host?: string;
  };
}

export function generateSecretManifest(
  name: string,
  namespace: string,
  secretData: Record<string, string>
): string {
  const dataYaml = Object.entries(secretData)
    .map(([k, v]) => `  ${k}: "${v}"`)
    .join("\n");

  return `apiVersion: v1
kind: Secret
metadata:
  name: ${name}
  namespace: ${namespace}
  labels:
    app: ${name.replace("-secrets", "")}
    managed-by: cluster-dashboard
type: Opaque
stringData:
${dataYaml}`;
}

export function generateDeploymentManifests(config: ManifestConfig): string {
  const { name, namespace, image, port, replicas, env, envVars, ingress } = config;

  // Separate plain env vars from secrets
  const plainEnvVars: { key: string; value: string }[] = [];
  const secretEnvVars: { key: string; value: string }[] = [];

  // Process old-style env (Record<string, string>) - treat as plain
  if (env && Object.keys(env).length > 0) {
    for (const [k, v] of Object.entries(env)) {
      plainEnvVars.push({ key: k, value: v });
    }
  }

  // Process new-style envVars (EnvVar[])
  if (envVars && envVars.length > 0) {
    for (const ev of envVars) {
      if (ev.key.trim()) {
        if (ev.isSecret) {
          secretEnvVars.push({ key: ev.key, value: ev.value });
        } else {
          plainEnvVars.push({ key: ev.key, value: ev.value });
        }
      }
    }
  }

  const hasSecrets = secretEnvVars.length > 0;
  const secretName = `${name}-secrets`;

  // Build env section YAML
  let envYaml = "";
  const allEnvEntries: string[] = [];

  // Plain env vars inline
  for (const { key, value } of plainEnvVars) {
    allEnvEntries.push(`            - name: ${key}\n              value: "${value}"`);
  }

  // Secret env vars via secretKeyRef
  for (const { key } of secretEnvVars) {
    allEnvEntries.push(`            - name: ${key}
              valueFrom:
                secretKeyRef:
                  name: ${secretName}
                  key: ${key}`);
  }

  if (allEnvEntries.length > 0) {
    envYaml = allEnvEntries.join("\n");
  }

  // Generate Secret manifest if needed
  let yaml = "";
  if (hasSecrets) {
    const secretData: Record<string, string> = {};
    for (const { key, value } of secretEnvVars) {
      secretData[key] = value;
    }
    yaml += generateSecretManifest(secretName, namespace, secretData);
    yaml += "\n---\n";
  }

  yaml += `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}
  namespace: ${namespace}
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
        - name: ${name}
          image: ${image}
          ports:
            - containerPort: ${port}${envYaml ? `\n          env:\n${envYaml}` : ""}
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
  name: ${name}
  namespace: ${namespace}
  labels:
    app: ${name}
    managed-by: cluster-dashboard
spec:
  type: ClusterIP
  ports:
    - port: ${port}
      targetPort: ${port}
  selector:
    app: ${name}`;

  if (ingress?.enabled && ingress.host) {
    yaml += `
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${name}
  namespace: ${namespace}
  labels:
    app: ${name}
    managed-by: cluster-dashboard
spec:
  rules:
    - host: ${ingress.host}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ${name}
                port:
                  number: ${port}`;
  }

  return yaml;
}

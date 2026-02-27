import type { ResourceTemplate } from "../types";

export const deploymentTemplate: ResourceTemplate = {
  id: "deployment",
  name: "Deployment",
  kind: "Deployment",
  apiVersion: "apps/v1",
  description: "A Deployment manages a set of replicated Pods, ensuring the desired number are running and updated in a controlled way.",
  icon: "\u{1F680}",
  sections: ["Basics", "Container", "Resources", "Environment", "Metadata"],
  fields: [
    { name: "name", label: "Name", type: "text", section: "Basics", default: "", required: true, placeholder: "my-deployment" },
    { name: "namespace", label: "Namespace", type: "text", section: "Basics", default: "default" },
    { name: "replicas", label: "Replicas", type: "number", section: "Basics", default: 1, min: 1, max: 20 },
    { name: "image", label: "Image", type: "text", section: "Container", default: "", required: true, placeholder: "nginx:latest" },
    { name: "containerPort", label: "Container Port", type: "number", section: "Container", default: 80 },
    { name: "command", label: "Command", type: "text", section: "Container", default: "", placeholder: "/bin/sh -c 'echo hello'" },
    { name: "cpuRequest", label: "CPU Request", type: "text", section: "Resources", default: "100m" },
    { name: "memoryRequest", label: "Memory Request", type: "text", section: "Resources", default: "128Mi" },
    { name: "cpuLimit", label: "CPU Limit", type: "text", section: "Resources", default: "250m" },
    { name: "memoryLimit", label: "Memory Limit", type: "text", section: "Resources", default: "256Mi" },
    { name: "env", label: "Environment Variables", type: "key-value", section: "Environment", default: {} },
    { name: "labels", label: "Labels", type: "key-value", section: "Metadata", default: {} },
  ],
  generateYaml: (values) => {
    const env = values.env as Record<string, string> | undefined;
    const labels = values.labels as Record<string, string> | undefined;
    const command = values.command as string | undefined;

    const allLabels: Record<string, string> = {
      app: values.name as string,
      "managed-by": "cluster-dashboard",
      ...labels,
    };

    const labelBlock = Object.entries(allLabels)
      .map(([k, v]) => `    ${k}: "${v}"`)
      .join("\n");

    const selectorBlock = Object.entries(allLabels)
      .map(([k, v]) => `      ${k}: "${v}"`)
      .join("\n");

    const podLabelBlock = Object.entries(allLabels)
      .map(([k, v]) => `        ${k}: "${v}"`)
      .join("\n");

    let envBlock = "";
    if (env && Object.keys(env).length > 0) {
      envBlock =
        "\n          env:\n" +
        Object.entries(env)
          .map(([k, v]) => `            - name: "${k}"\n              value: "${v}"`)
          .join("\n");
    }

    let commandBlock = "";
    if (command) {
      commandBlock = `\n          command: [${command.split(" ").map((c) => `"${c}"`).join(", ")}]`;
    }

    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${values.name}
  namespace: ${values.namespace}
  labels:
${labelBlock}
spec:
  replicas: ${values.replicas}
  selector:
    matchLabels:
${selectorBlock}
  template:
    metadata:
      labels:
${podLabelBlock}
    spec:
      containers:
        - name: ${values.name}
          image: ${values.image}
          ports:
            - containerPort: ${values.containerPort}${commandBlock}${envBlock}
          resources:
            requests:
              cpu: "${values.cpuRequest}"
              memory: "${values.memoryRequest}"
            limits:
              cpu: "${values.cpuLimit}"
              memory: "${values.memoryLimit}"`;
  },
};

import type { ResourceTemplate } from "../types";

export const serviceTemplate: ResourceTemplate = {
  id: "service",
  name: "Service",
  kind: "Service",
  apiVersion: "v1",
  description: "A Service exposes a set of Pods as a network service with a stable IP address and DNS name.",
  icon: "\u{1F50C}",
  sections: ["Basics", "Ports", "Selector"],
  fields: [
    { name: "name", label: "Name", type: "text", section: "Basics", default: "", required: true, placeholder: "my-service" },
    { name: "namespace", label: "Namespace", type: "text", section: "Basics", default: "default" },
    { name: "type", label: "Service Type", type: "select", section: "Basics", default: "ClusterIP", options: [
      { label: "ClusterIP", value: "ClusterIP" },
      { label: "NodePort", value: "NodePort" },
      { label: "LoadBalancer", value: "LoadBalancer" },
    ]},
    { name: "port", label: "Port", type: "number", section: "Ports", default: 80 },
    { name: "targetPort", label: "Target Port", type: "number", section: "Ports", default: 80 },
    { name: "selector", label: "Selector", type: "key-value", section: "Selector", default: {} },
  ],
  generateYaml: (values) => {
    const selector = values.selector as Record<string, string> | undefined;

    const selectorBlock = selector && Object.keys(selector).length > 0
      ? Object.entries(selector).map(([k, v]) => `    ${k}: "${v}"`).join("\n")
      : `    app: "${values.name}"`;

    return `apiVersion: v1
kind: Service
metadata:
  name: ${values.name}
  namespace: ${values.namespace}
  labels:
    managed-by: "cluster-dashboard"
spec:
  type: ${values.type}
  ports:
    - port: ${values.port}
      targetPort: ${values.targetPort}
      protocol: TCP
  selector:
${selectorBlock}`;
  },
};

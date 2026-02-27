import type { ResourceTemplate } from "../types";

export const ingressTemplate: ResourceTemplate = {
  id: "ingress",
  name: "Ingress",
  kind: "Ingress",
  apiVersion: "networking.k8s.io/v1",
  description: "An Ingress exposes HTTP and HTTPS routes from outside the cluster to Services within the cluster.",
  icon: "\u{1F310}",
  sections: ["Basics", "Rules", "TLS"],
  fields: [
    { name: "name", label: "Name", type: "text", section: "Basics", default: "", required: true, placeholder: "my-ingress" },
    { name: "namespace", label: "Namespace", type: "text", section: "Basics", default: "default" },
    { name: "ingressClass", label: "Ingress Class", type: "text", section: "Basics", default: "", placeholder: "nginx" },
    { name: "host", label: "Host", type: "text", section: "Rules", default: "", required: true, placeholder: "example.com" },
    { name: "path", label: "Path", type: "text", section: "Rules", default: "/" },
    { name: "pathType", label: "Path Type", type: "select", section: "Rules", default: "Prefix", options: [
      { label: "Prefix", value: "Prefix" },
      { label: "Exact", value: "Exact" },
      { label: "ImplementationSpecific", value: "ImplementationSpecific" },
    ]},
    { name: "serviceName", label: "Service Name", type: "text", section: "Rules", default: "", required: true, placeholder: "my-service" },
    { name: "servicePort", label: "Service Port", type: "number", section: "Rules", default: 80 },
    { name: "tlsEnabled", label: "Enable TLS", type: "toggle", section: "TLS", default: false },
    { name: "tlsSecretName", label: "TLS Secret Name", type: "text", section: "TLS", default: "", placeholder: "tls-secret", condition: { field: "tlsEnabled", value: true } },
  ],
  generateYaml: (values) => {
    const ingressClass = values.ingressClass as string | undefined;

    let annotationsBlock = "";
    if (ingressClass) {
      annotationsBlock = `\n  annotations:\n    kubernetes.io/ingress.class: "${ingressClass}"`;
    }

    let tlsBlock = "";
    if (values.tlsEnabled) {
      tlsBlock = `\n  tls:\n    - hosts:\n        - ${values.host}\n      secretName: ${values.tlsSecretName}`;
    }

    return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${values.name}
  namespace: ${values.namespace}
  labels:
    managed-by: "cluster-dashboard"${annotationsBlock}
spec:${tlsBlock}
  rules:
    - host: ${values.host}
      http:
        paths:
          - path: ${values.path}
            pathType: ${values.pathType}
            backend:
              service:
                name: ${values.serviceName}
                port:
                  number: ${values.servicePort}`;
  },
};

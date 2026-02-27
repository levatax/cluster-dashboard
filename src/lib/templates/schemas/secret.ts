import type { ResourceTemplate } from "../types";

export const secretTemplate: ResourceTemplate = {
  id: "secret",
  name: "Secret",
  kind: "Secret",
  apiVersion: "v1",
  description: "A Secret stores sensitive data such as passwords, tokens, or keys in base64-encoded form.",
  icon: "\u{1F511}",
  sections: ["Basics", "Data"],
  fields: [
    { name: "name", label: "Name", type: "text", section: "Basics", default: "", required: true, placeholder: "my-secret" },
    { name: "namespace", label: "Namespace", type: "text", section: "Basics", default: "default" },
    { name: "secretType", label: "Secret Type", type: "select", section: "Basics", default: "Opaque", options: [
      { label: "Opaque", value: "Opaque" },
      { label: "kubernetes.io/tls", value: "kubernetes.io/tls" },
      { label: "kubernetes.io/dockerconfigjson", value: "kubernetes.io/dockerconfigjson" },
    ]},
    { name: "data", label: "Data", type: "key-value", section: "Data", default: {}, description: "Values will be base64 encoded in the generated YAML" },
  ],
  generateYaml: (values) => {
    const data = values.data as Record<string, string> | undefined;

    let dataBlock = "";
    if (data && Object.keys(data).length > 0) {
      dataBlock =
        "\ndata:\n" +
        Object.entries(data)
          .map(([k, v]) => `  ${k}: ${Buffer.from(v).toString("base64")}`)
          .join("\n");
    }

    return `apiVersion: v1
kind: Secret
metadata:
  name: ${values.name}
  namespace: ${values.namespace}
  labels:
    managed-by: "cluster-dashboard"
type: ${values.secretType}${dataBlock}`;
  },
};

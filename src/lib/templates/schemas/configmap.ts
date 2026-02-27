import type { ResourceTemplate } from "../types";

export const configMapTemplate: ResourceTemplate = {
  id: "configmap",
  name: "ConfigMap",
  kind: "ConfigMap",
  apiVersion: "v1",
  description: "A ConfigMap stores non-confidential configuration data as key-value pairs for use by Pods.",
  icon: "\u{1F4CB}",
  sections: ["Basics", "Data"],
  fields: [
    { name: "name", label: "Name", type: "text", section: "Basics", default: "", required: true, placeholder: "my-configmap" },
    { name: "namespace", label: "Namespace", type: "text", section: "Basics", default: "default" },
    { name: "data", label: "Data", type: "key-value", section: "Data", default: {} },
  ],
  generateYaml: (values) => {
    const data = values.data as Record<string, string> | undefined;

    let dataBlock = "";
    if (data && Object.keys(data).length > 0) {
      dataBlock =
        "\ndata:\n" +
        Object.entries(data)
          .map(([k, v]) => `  ${k}: "${v}"`)
          .join("\n");
    }

    return `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${values.name}
  namespace: ${values.namespace}
  labels:
    managed-by: "cluster-dashboard"${dataBlock}`;
  },
};

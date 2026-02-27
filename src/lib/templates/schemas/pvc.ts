import type { ResourceTemplate } from "../types";

export const pvcTemplate: ResourceTemplate = {
  id: "pvc",
  name: "PersistentVolumeClaim",
  kind: "PersistentVolumeClaim",
  apiVersion: "v1",
  description: "A PersistentVolumeClaim requests storage resources from the cluster with a specific size and access mode.",
  icon: "\u{1F4BE}",
  sections: ["Basics", "Storage"],
  fields: [
    { name: "name", label: "Name", type: "text", section: "Basics", default: "", required: true, placeholder: "my-pvc" },
    { name: "namespace", label: "Namespace", type: "text", section: "Basics", default: "default" },
    { name: "storageClass", label: "Storage Class", type: "text", section: "Storage", default: "", placeholder: "standard" },
    { name: "accessMode", label: "Access Mode", type: "select", section: "Storage", default: "ReadWriteOnce", options: [
      { label: "ReadWriteOnce", value: "ReadWriteOnce" },
      { label: "ReadOnlyMany", value: "ReadOnlyMany" },
      { label: "ReadWriteMany", value: "ReadWriteMany" },
    ]},
    { name: "storageSize", label: "Storage Size", type: "text", section: "Storage", default: "10Gi", required: true, placeholder: "10Gi" },
  ],
  generateYaml: (values) => {
    const storageClass = values.storageClass as string | undefined;

    let storageClassBlock = "";
    if (storageClass) {
      storageClassBlock = `\n  storageClassName: ${storageClass}`;
    }

    return `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${values.name}
  namespace: ${values.namespace}
  labels:
    managed-by: "cluster-dashboard"
spec:${storageClassBlock}
  accessModes:
    - ${values.accessMode}
  resources:
    requests:
      storage: ${values.storageSize}`;
  },
};

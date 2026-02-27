import type { ResourceTemplate } from "../types";

export const statefulSetTemplate: ResourceTemplate = {
  id: "statefulset",
  name: "StatefulSet",
  kind: "StatefulSet",
  apiVersion: "apps/v1",
  description: "A StatefulSet manages stateful applications with stable network identities and persistent storage per Pod.",
  icon: "\u{1F5C4}\uFE0F",
  sections: ["Basics", "Container", "Storage"],
  fields: [
    { name: "name", label: "Name", type: "text", section: "Basics", default: "", required: true, placeholder: "my-statefulset" },
    { name: "namespace", label: "Namespace", type: "text", section: "Basics", default: "default" },
    { name: "replicas", label: "Replicas", type: "number", section: "Basics", default: 1 },
    { name: "serviceName", label: "Service Name", type: "text", section: "Basics", default: "", required: true, placeholder: "my-service" },
    { name: "image", label: "Image", type: "text", section: "Container", default: "", required: true, placeholder: "postgres:16" },
    { name: "containerPort", label: "Container Port", type: "number", section: "Container", default: 80 },
    { name: "storageSize", label: "Storage Size", type: "text", section: "Storage", default: "10Gi" },
    { name: "storageClass", label: "Storage Class", type: "text", section: "Storage", default: "", placeholder: "standard" },
  ],
  generateYaml: (values) => {
    const storageClass = values.storageClass as string | undefined;

    let storageClassBlock = "";
    if (storageClass) {
      storageClassBlock = `\n          storageClassName: ${storageClass}`;
    }

    return `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ${values.name}
  namespace: ${values.namespace}
  labels:
    managed-by: "cluster-dashboard"
spec:
  serviceName: ${values.serviceName}
  replicas: ${values.replicas}
  selector:
    matchLabels:
      app: "${values.name}"
      managed-by: "cluster-dashboard"
  template:
    metadata:
      labels:
        app: "${values.name}"
        managed-by: "cluster-dashboard"
    spec:
      containers:
        - name: ${values.name}
          image: ${values.image}
          ports:
            - containerPort: ${values.containerPort}
          volumeMounts:
            - name: data
              mountPath: /data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:${storageClassBlock}
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: ${values.storageSize}`;
  },
};

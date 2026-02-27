import type { ResourceTemplate } from "../types";

export const cronJobTemplate: ResourceTemplate = {
  id: "cronjob",
  name: "CronJob",
  kind: "CronJob",
  apiVersion: "batch/v1",
  description: "A CronJob creates Jobs on a repeating schedule, useful for periodic tasks like backups or report generation.",
  icon: "\u23F0",
  sections: ["Basics", "Schedule", "Container"],
  fields: [
    { name: "name", label: "Name", type: "text", section: "Basics", default: "", required: true, placeholder: "my-cronjob" },
    { name: "namespace", label: "Namespace", type: "text", section: "Basics", default: "default" },
    { name: "schedule", label: "Schedule", type: "text", section: "Schedule", default: "", required: true, placeholder: "*/5 * * * *", description: "Cron expression for the job schedule" },
    { name: "successfulJobsHistoryLimit", label: "Successful Jobs History Limit", type: "number", section: "Schedule", default: 3 },
    { name: "failedJobsHistoryLimit", label: "Failed Jobs History Limit", type: "number", section: "Schedule", default: 1 },
    { name: "image", label: "Image", type: "text", section: "Container", default: "", required: true, placeholder: "busybox:latest" },
    { name: "command", label: "Command", type: "text", section: "Container", default: "", placeholder: "/bin/sh -c 'echo hello'" },
    { name: "restartPolicy", label: "Restart Policy", type: "select", section: "Container", default: "Never", options: [
      { label: "Never", value: "Never" },
      { label: "OnFailure", value: "OnFailure" },
    ]},
  ],
  generateYaml: (values) => {
    const command = values.command as string | undefined;

    let commandBlock = "";
    if (command) {
      commandBlock = `\n              command: [${command.split(" ").map((c) => `"${c}"`).join(", ")}]`;
    }

    return `apiVersion: batch/v1
kind: CronJob
metadata:
  name: ${values.name}
  namespace: ${values.namespace}
  labels:
    managed-by: "cluster-dashboard"
spec:
  schedule: "${values.schedule}"
  successfulJobsHistoryLimit: ${values.successfulJobsHistoryLimit}
  failedJobsHistoryLimit: ${values.failedJobsHistoryLimit}
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            managed-by: "cluster-dashboard"
        spec:
          restartPolicy: ${values.restartPolicy}
          containers:
            - name: ${values.name}
              image: ${values.image}${commandBlock}`;
  },
};

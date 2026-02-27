import type { ResourceTemplate } from "./types";

import { deploymentTemplate } from "./schemas/deployment";
import { serviceTemplate } from "./schemas/service";
import { ingressTemplate } from "./schemas/ingress";
import { configMapTemplate } from "./schemas/configmap";
import { secretTemplate } from "./schemas/secret";
import { pvcTemplate } from "./schemas/pvc";
import { cronJobTemplate } from "./schemas/cronjob";
import { statefulSetTemplate } from "./schemas/statefulset";

const ALL_TEMPLATES: ResourceTemplate[] = [
  deploymentTemplate,
  serviceTemplate,
  ingressTemplate,
  configMapTemplate,
  secretTemplate,
  pvcTemplate,
  cronJobTemplate,
  statefulSetTemplate,
];

export function getAllTemplates(): ResourceTemplate[] {
  return ALL_TEMPLATES;
}

export function getTemplate(id: string): ResourceTemplate | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id);
}

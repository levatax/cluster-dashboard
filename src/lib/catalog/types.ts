export type CatalogCategory =
  | "databases"
  | "caching"
  | "web-servers"
  | "monitoring"
  | "message-queues"
  | "storage"
  | "ci-cd"
  | "security"
  | "networking";

export interface ConfigField {
  name: string;
  label: string;
  type: "text" | "number" | "password" | "select" | "toggle";
  default: string | number | boolean;
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
}

export interface CatalogApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: CatalogCategory;
  version: string;
  versions: string[];
  website?: string;
  configFields: ConfigField[];
  helmChart?: {
    repo: string;
    repoUrl: string;
    chart: string;
    defaultValues?: Record<string, unknown>;
  };
  generateManifests: (config: Record<string, unknown>) => string;
}

export interface AppInstallRow {
  id: string;
  cluster_id: string;
  catalog_app_id: string;
  release_name: string;
  namespace: string;
  config_values: Record<string, unknown>;
  deploy_method: "manifest" | "helm";
  status: "deploying" | "deployed" | "failed" | "uninstalling" | "uninstalled";
  created_at: string;
  updated_at: string;
}

export const CATEGORY_LABELS: Record<CatalogCategory, string> = {
  databases: "Databases",
  caching: "Caching",
  "web-servers": "Web Servers",
  monitoring: "Monitoring",
  "message-queues": "Message Queues",
  storage: "Storage",
  "ci-cd": "CI/CD",
  security: "Security",
  networking: "Networking",
};

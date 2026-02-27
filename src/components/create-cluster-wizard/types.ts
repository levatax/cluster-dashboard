export interface MasterNodeConfig {
  ip: string;
  sshPort: string;
  sshUser: string;
}

export interface WorkerNodeConfig {
  id: string;
  ip: string;
  sshPort: string;
  sshUser: string;
}

export interface WizardFormData {
  clusterName: string;
  master: MasterNodeConfig;
  nodeToken: string;
  kubeconfigYaml: string;
  workers: WorkerNodeConfig[];
}

export const WIZARD_STEPS = [
  { id: "configure", title: "Configure" },
  { id: "install-master", title: "Install Master" },
  { id: "add-workers", title: "Add Workers" },
  { id: "verify-import", title: "Verify & Import" },
] as const;

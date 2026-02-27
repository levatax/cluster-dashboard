"use client";

import { AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CommandBlock } from "./command-block";
import type { MasterNodeConfig } from "./types";

interface StepInstallMasterProps {
  master: MasterNodeConfig;
  nodeToken: string;
  kubeconfigYaml: string;
  onNodeTokenChange: (token: string) => void;
  onKubeconfigChange: (yaml: string) => void;
}

export function StepInstallMaster({
  master,
  nodeToken,
  kubeconfigYaml,
  onNodeTokenChange,
  onKubeconfigChange,
}: StepInstallMasterProps) {
  const sshCommand =
    master.sshPort === "22"
      ? `ssh ${master.sshUser}@${master.ip}`
      : `ssh ${master.sshUser}@${master.ip} -p ${master.sshPort}`;

  return (
    <div className="space-y-4">
      <CommandBlock
        label="1. SSH into your master node"
        command={sshCommand}
      />

      <CommandBlock
        label="2. Install K3s server"
        description="This installs K3s and starts the server automatically."
        command="curl -sfL https://get.k3s.io | sh -"
      />

      <CommandBlock
        label="3. Get the node token"
        description="You'll need this to join worker nodes later."
        command="cat /var/lib/rancher/k3s/server/node-token"
      />

      <div className="space-y-2">
        <Label htmlFor="node-token">Paste node token here</Label>
        <Textarea
          id="node-token"
          placeholder="K10...::server:..."
          value={nodeToken}
          onChange={(e) => onNodeTokenChange(e.target.value)}
          rows={2}
          className="resize-y font-mono text-xs"
        />
      </div>

      <CommandBlock
        label="4. Get the kubeconfig"
        command="cat /etc/rancher/k3s/k3s.yaml"
      />

      <div className="space-y-2">
        <Label htmlFor="kubeconfig-paste">Paste kubeconfig here</Label>
        <Textarea
          id="kubeconfig-paste"
          placeholder="apiVersion: v1&#10;clusters:&#10;- cluster:&#10;    server: https://127.0.0.1:6443&#10;..."
          value={kubeconfigYaml}
          onChange={(e) => onKubeconfigChange(e.target.value)}
          rows={6}
          className="resize-y font-mono text-xs"
        />
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-yellow-500" />
        <p className="text-xs text-muted-foreground">
          The kubeconfig will contain{" "}
          <code className="rounded bg-muted px-1 font-mono">127.0.0.1</code>{" "}
          as the server address. This will be automatically fixed to your
          master node IP in the final step.
        </p>
      </div>
    </div>
  );
}

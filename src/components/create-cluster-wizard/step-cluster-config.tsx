"use client";

import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { MasterNodeConfig } from "./types";

interface StepClusterConfigProps {
  clusterName: string;
  master: MasterNodeConfig;
  onClusterNameChange: (name: string) => void;
  onMasterChange: (master: MasterNodeConfig) => void;
}

export function StepClusterConfig({
  clusterName,
  master,
  onClusterNameChange,
  onMasterChange,
}: StepClusterConfigProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <Info className="size-4" />
        <AlertDescription>
          This wizard helps you install{" "}
          <strong>K3s</strong> (lightweight Kubernetes) on your VPS machines.
          It generates commands for you to run — no SSH access is needed from
          the dashboard.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="cluster-name">Cluster Name</Label>
        <Input
          id="cluster-name"
          placeholder="my-cluster"
          value={clusterName}
          onChange={(e) => onClusterNameChange(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="master-ip">Master Node IP</Label>
        <Input
          id="master-ip"
          placeholder="203.0.113.10"
          value={master.ip}
          onChange={(e) => onMasterChange({ ...master, ip: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ssh-port">SSH Port</Label>
          <Input
            id="ssh-port"
            placeholder="22"
            value={master.sshPort}
            onChange={(e) =>
              onMasterChange({ ...master, sshPort: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ssh-user">SSH User</Label>
          <Input
            id="ssh-user"
            placeholder="root"
            value={master.sshUser}
            onChange={(e) =>
              onMasterChange({ ...master, sshUser: e.target.value })
            }
          />
        </div>
      </div>
    </div>
  );
}

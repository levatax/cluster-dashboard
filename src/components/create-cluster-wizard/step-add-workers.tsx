"use client";

import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CommandBlock } from "./command-block";
import type { MasterNodeConfig, WorkerNodeConfig } from "./types";

interface StepAddWorkersProps {
  master: MasterNodeConfig;
  nodeToken: string;
  workers: WorkerNodeConfig[];
  onWorkersChange: (workers: WorkerNodeConfig[]) => void;
}

export function StepAddWorkers({
  master,
  nodeToken,
  workers,
  onWorkersChange,
}: StepAddWorkersProps) {
  function addWorker() {
    onWorkersChange([
      ...workers,
      { id: crypto.randomUUID(), ip: "", sshPort: "22", sshUser: "root" },
    ]);
  }

  function removeWorker(id: string) {
    onWorkersChange(workers.filter((w) => w.id !== id));
  }

  function updateWorker(id: string, updates: Partial<WorkerNodeConfig>) {
    onWorkersChange(
      workers.map((w) => (w.id === id ? { ...w, ...updates } : w))
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Add worker nodes to your cluster. This step is optional — you can skip
        it for a single-node setup.
      </p>

      {workers.map((worker, index) => {
        const sshCommand =
          worker.sshPort === "22"
            ? `ssh ${worker.sshUser}@${worker.ip}`
            : `ssh ${worker.sshUser}@${worker.ip} -p ${worker.sshPort}`;

        const joinCommand = `curl -sfL https://get.k3s.io | K3S_URL=https://${master.ip}:6443 K3S_TOKEN=${nodeToken || "<NODE_TOKEN>"} sh -`;

        return (
          <Card key={worker.id}>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Worker {index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => removeWorker(worker.id)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">IP Address</Label>
                  <Input
                    placeholder="203.0.113.11"
                    value={worker.ip}
                    onChange={(e) =>
                      updateWorker(worker.id, { ip: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">SSH Port</Label>
                  <Input
                    placeholder="22"
                    value={worker.sshPort}
                    onChange={(e) =>
                      updateWorker(worker.id, { sshPort: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">SSH User</Label>
                  <Input
                    placeholder="root"
                    value={worker.sshUser}
                    onChange={(e) =>
                      updateWorker(worker.id, { sshUser: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>
              </div>

              {worker.ip && (
                <div className="space-y-2">
                  <CommandBlock
                    label="1. SSH into worker"
                    command={sshCommand}
                  />
                  <CommandBlock
                    label="2. Join the cluster"
                    command={joinCommand}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Button variant="outline" className="w-full" onClick={addWorker}>
        <Plus className="mr-2 size-4" />
        Add Worker Node
      </Button>
    </div>
  );
}

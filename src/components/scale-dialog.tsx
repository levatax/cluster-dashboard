"use client";

import { useState } from "react";
import { Minus, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { scaleDeploymentAction } from "@/app/actions/kubernetes";

interface ScaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clusterId: string;
  namespace: string;
  deploymentName: string;
  currentReplicas: number;
  onSuccess: () => void;
}

export function ScaleDialog({
  open,
  onOpenChange,
  clusterId,
  namespace,
  deploymentName,
  currentReplicas,
  onSuccess,
}: ScaleDialogProps) {
  const [replicas, setReplicas] = useState(currentReplicas);
  const [loading, setLoading] = useState(false);

  async function handleScale() {
    setLoading(true);
    try {
      const result = await scaleDeploymentAction(clusterId, namespace, deploymentName, replicas);
      if (result.success) {
        toast.success(`Scaled ${deploymentName} to ${replicas} replicas`);
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scale Deployment</DialogTitle>
          <DialogDescription>
            Adjust the number of replicas for <span className="font-semibold">{deploymentName}</span> in{" "}
            <span className="font-mono text-xs">{namespace}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center gap-4 py-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setReplicas((r) => Math.max(0, r - 1))}
            disabled={replicas <= 0 || loading}
          >
            <Minus className="size-4" />
          </Button>
          <Input
            type="number"
            min={0}
            value={replicas}
            onChange={(e) => setReplicas(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-20 text-center text-lg font-semibold"
            disabled={loading}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setReplicas((r) => r + 1)}
            disabled={loading}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <p className="text-muted-foreground text-center text-sm">
          Current: {currentReplicas} replicas → New: {replicas} replicas
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleScale} disabled={loading || replicas === currentReplicas}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Scale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { MoreHorizontal, ShieldOff, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import {
  cordonNodeAction,
  uncordonNodeAction,
  drainNodeAction,
} from "@/app/actions/kubernetes";
import type { NodeInfo } from "@/lib/types";

interface NodeActionsDropdownProps {
  node: NodeInfo;
  clusterId: string;
  onRefresh: () => void;
}

export function NodeActionsDropdown({
  node,
  clusterId,
  onRefresh,
}: NodeActionsDropdownProps) {
  const [cordonLoading, setCordonLoading] = useState(false);
  const [drainOpen, setDrainOpen] = useState(false);
  const [drainLoading, setDrainLoading] = useState(false);
  const [ignoreDaemonSets, setIgnoreDaemonSets] = useState(true);

  async function handleCordonToggle() {
    setCordonLoading(true);
    try {
      const action = node.schedulable ? cordonNodeAction : uncordonNodeAction;
      const result = await action(clusterId, node.name);
      if (result.success) {
        toast.success(
          node.schedulable
            ? `Cordoned node "${node.name}"`
            : `Uncordoned node "${node.name}"`
        );
        onRefresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setCordonLoading(false);
    }
  }

  async function handleDrain() {
    setDrainLoading(true);
    try {
      const result = await drainNodeAction(clusterId, node.name, {
        ignoreDaemonSets,
      });
      if (result.success) {
        const { evicted, errors } = result.data;
        if (errors.length > 0) {
          toast.warning(
            `Drained "${node.name}": ${evicted.length} pods evicted, ${errors.length} errors`
          );
        } else {
          toast.success(
            `Drained "${node.name}": ${evicted.length} pods evicted`
          );
        }
        setDrainOpen(false);
        onRefresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setDrainLoading(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCordonToggle} disabled={cordonLoading}>
            {cordonLoading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : node.schedulable ? (
              <ShieldOff className="mr-2 size-4" />
            ) : (
              <Shield className="mr-2 size-4" />
            )}
            {node.schedulable ? "Cordon" : "Uncordon"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDrainOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <ShieldOff className="mr-2 size-4" />
            Drain
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={drainOpen}
        onOpenChange={setDrainOpen}
        title={`Drain Node "${node.name}"?`}
        description="This will cordon the node and evict all pods (except DaemonSet pods by default). Evicted pods will be rescheduled on other nodes."
        confirmLabel="Drain Node"
        variant="destructive"
        loading={drainLoading}
        onConfirm={handleDrain}
      >
        <div className="flex items-center space-x-2 py-2">
          <Checkbox
            id="ignore-daemonsets"
            checked={ignoreDaemonSets}
            onCheckedChange={(checked) => setIgnoreDaemonSets(checked === true)}
          />
          <Label htmlFor="ignore-daemonsets" className="text-sm">
            Ignore DaemonSet pods
          </Label>
        </div>
      </ConfirmDialog>
    </>
  );
}

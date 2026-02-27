"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateAlertConfig } from "@/app/actions/alerts";
import type { AlertConfig } from "@/lib/db";

interface AlertConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clusterId: string;
  alertConfigs: AlertConfig[];
  onSaved: () => void;
}

interface MetricConfig {
  warning: number;
  critical: number;
  enabled: boolean;
}

export function AlertConfigDialog({
  open,
  onOpenChange,
  clusterId,
  alertConfigs,
  onSaved,
}: AlertConfigDialogProps) {
  const defaults = useMemo(() => {
    const cpuConf = alertConfigs.find((c) => c.metric === "cpu");
    const memConf = alertConfigs.find((c) => c.metric === "memory");
    return {
      cpu: cpuConf
        ? { warning: cpuConf.warning_threshold, critical: cpuConf.critical_threshold, enabled: !!cpuConf.enabled }
        : { warning: 70, critical: 85, enabled: true },
      memory: memConf
        ? { warning: memConf.warning_threshold, critical: memConf.critical_threshold, enabled: !!memConf.enabled }
        : { warning: 70, critical: 85, enabled: true },
    };
  }, [alertConfigs]);

  const [cpu, setCpu] = useState<MetricConfig>(defaults.cpu);
  const [memory, setMemory] = useState<MetricConfig>(defaults.memory);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all([
        updateAlertConfig(clusterId, "cpu", cpu.warning, cpu.critical, cpu.enabled),
        updateAlertConfig(clusterId, "memory", memory.warning, memory.critical, memory.enabled),
      ]);
      toast.success("Alert thresholds saved");
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Failed to save alert config");
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Resource Alerts</DialogTitle>
          <DialogDescription>
            Set warning and critical thresholds for CPU and memory usage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">CPU Usage</span>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="cpu-enabled"
                  checked={cpu.enabled}
                  onCheckedChange={(checked) => setCpu({ ...cpu, enabled: !!checked })}
                />
                <Label htmlFor="cpu-enabled" className="text-sm">Enabled</Label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cpu-warning" className="text-muted-foreground text-xs">Warning (%)</Label>
                <Input
                  id="cpu-warning"
                  type="number"
                  min={0}
                  max={100}
                  value={cpu.warning}
                  onChange={(e) => setCpu({ ...cpu, warning: Number(e.target.value) })}
                  disabled={!cpu.enabled}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cpu-critical" className="text-muted-foreground text-xs">Critical (%)</Label>
                <Input
                  id="cpu-critical"
                  type="number"
                  min={0}
                  max={100}
                  value={cpu.critical}
                  onChange={(e) => setCpu({ ...cpu, critical: Number(e.target.value) })}
                  disabled={!cpu.enabled}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Memory Usage</span>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="memory-enabled"
                  checked={memory.enabled}
                  onCheckedChange={(checked) => setMemory({ ...memory, enabled: !!checked })}
                />
                <Label htmlFor="memory-enabled" className="text-sm">Enabled</Label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="memory-warning" className="text-muted-foreground text-xs">Warning (%)</Label>
                <Input
                  id="memory-warning"
                  type="number"
                  min={0}
                  max={100}
                  value={memory.warning}
                  onChange={(e) => setMemory({ ...memory, warning: Number(e.target.value) })}
                  disabled={!memory.enabled}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="memory-critical" className="text-muted-foreground text-xs">Critical (%)</Label>
                <Input
                  id="memory-critical"
                  type="number"
                  min={0}
                  max={100}
                  value={memory.critical}
                  onChange={(e) => setMemory({ ...memory, critical: Number(e.target.value) })}
                  disabled={!memory.enabled}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

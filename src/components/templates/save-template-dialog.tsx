"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { saveDeploymentTemplate, type DeploymentTemplateConfig } from "@/app/actions/deployment-templates";
import { Loader2, Save, Lock } from "lucide-react";
import { toast } from "sonner";

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: DeploymentTemplateConfig;
  sourceType: "github" | "app_catalog";
  catalogAppId?: string;
  onSaved?: () => void;
}

export function SaveTemplateDialog({
  open,
  onOpenChange,
  config,
  sourceType,
  catalogAppId,
  onSaved,
}: SaveTemplateDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    setSaving(true);
    const result = await saveDeploymentTemplate(
      name,
      description || null,
      sourceType,
      config,
      catalogAppId
    );

    if (result.success) {
      toast.success(`Template "${name}" saved`);
      setName("");
      setDescription("");
      onOpenChange(false);
      onSaved?.();
    } else {
      toast.error(result.error);
    }
    setSaving(false);
  }

  const secretCount = config.envVars?.filter((e) => e.isSecret).length || 0;
  const plainEnvCount = (config.envVars?.length || 0) - secretCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save this deployment configuration as a reusable template.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="template-name">Name *</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My App Template"
              autoFocus
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of this template..."
              rows={2}
            />
          </div>

          <div className="rounded-md border p-3 bg-muted/30">
            <h4 className="text-sm font-medium mb-2">Configuration Preview</h4>
            <ScrollArea className="max-h-[180px]">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">App Name:</span>
                  <span className="font-mono">{config.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Namespace:</span>
                  <span className="font-mono">{config.namespace}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Image:</span>
                  <span className="font-mono truncate max-w-[180px]">{config.image || "(build from source)"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Port:</span>
                  <span className="font-mono">{config.port}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Replicas:</span>
                  <span className="font-mono">{config.replicas}</span>
                </div>
                {config.ingressEnabled && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ingress:</span>
                    <span className="font-mono">{config.ingressHost || "enabled"}</span>
                  </div>
                )}
                {(plainEnvCount > 0 || secretCount > 0) && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Env Vars:</span>
                    <div className="flex gap-1">
                      {plainEnvCount > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {plainEnvCount} var{plainEnvCount !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      {secretCount > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          <Lock className="mr-0.5 size-2.5" />
                          {secretCount} secret{secretCount !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                {config.repoUrl && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Repo:</span>
                    <span className="font-mono truncate max-w-[180px]">
                      {config.repoUrl.replace("https://github.com/", "")}
                    </span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {secretCount > 0 && (
            <p className="text-xs text-muted-foreground">
              <Lock className="inline size-3 mr-1" />
              Secret values will be saved in the template. Use caution when sharing templates.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 size-4" />
            )}
            {saving ? "Saving..." : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

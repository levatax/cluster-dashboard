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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppConfigForm } from "./app-config-form";
import { CATEGORY_LABELS } from "@/lib/catalog/types";
import type { CatalogCategory, ConfigField } from "@/lib/catalog/types";
type CatalogAppView = { id: string; name: string; description: string; icon: string; category: CatalogCategory; version: string; versions: string[]; website?: string; configFields: ConfigField[]; helmChart?: { repo: string; repoUrl: string; chart: string } };
import { Loader2 } from "lucide-react";

interface AppDetailDialogProps {
  app: CatalogAppView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstall: (appId: string, config: Record<string, unknown>, deployMethod: "manifest" | "helm") => Promise<void>;
  helmAvailable?: boolean;
  clusterId: string;
}

export function AppDetailDialog({
  app,
  open,
  onOpenChange,
  onInstall,
  helmAvailable,
  clusterId,
}: AppDetailDialogProps) {
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [deployMethod, setDeployMethod] = useState<"manifest" | "helm">("manifest");
  const [installing, setInstalling] = useState(false);

  if (!app) return null;

  // Initialize config with defaults when app changes
  const effectiveConfig = { ...Object.fromEntries(app.configFields.map((f) => [f.name, f.default])), ...config };

  async function handleInstall() {
    if (!app) return;
    setInstalling(true);
    try {
      await onInstall(app.id, effectiveConfig, deployMethod);
      setConfig({});
      onOpenChange(false);
    } finally {
      setInstalling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-2xl">
              {app.icon}
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                {app.name}
                <Badge variant="outline" className="text-[10px]">v{app.version}</Badge>
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {app.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-[10px]">
            {CATEGORY_LABELS[app.category]}
          </Badge>
          {app.website && (
            <a
              href={app.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Website
            </a>
          )}
        </div>

        {/* Deploy method selector */}
        <div className="flex gap-1 mt-2">
          <Button
            variant={deployMethod === "manifest" ? "default" : "outline"}
            size="sm"
            onClick={() => setDeployMethod("manifest")}
            className="text-xs h-7"
          >
            Manifest
          </Button>
          {app.helmChart && (
            <Button
              variant={deployMethod === "helm" ? "default" : "outline"}
              size="sm"
              onClick={() => setDeployMethod("helm")}
              disabled={!helmAvailable}
              className="text-xs h-7"
              title={!helmAvailable ? "Helm CLI not detected" : undefined}
            >
              Helm {!helmAvailable && "(unavailable)"}
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[40vh] pr-4 mt-2">
          <AppConfigForm
            fields={app.configFields}
            values={effectiveConfig}
            onChange={(name, value) => setConfig((prev) => ({ ...prev, [name]: value }))}
            clusterId={clusterId}
          />
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInstall} disabled={installing}>
            {installing && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {installing ? "Deploying..." : "Deploy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

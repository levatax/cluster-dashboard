"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NamespaceSelectorWithCreate } from "@/components/namespace-selector-with-create";
import { EnvVarsEditor, type EnvVar } from "./env-vars-editor";

export type { EnvVar };

export interface DeployConfig {
  name: string;
  namespace: string;
  image: string;
  port: number;
  replicas: number;
  ingressEnabled: boolean;
  ingressHost: string;
  envVars: EnvVar[];
}

interface DeployConfigEditorProps {
  clusterId: string;
  config: DeployConfig;
  onChange: (config: DeployConfig) => void;
  showImage?: boolean;
  buildMode?: boolean;
  showIngress?: boolean;
}

export function DeployConfigEditor({
  clusterId,
  config,
  onChange,
  showImage = true,
  buildMode = false,
  showIngress = true,
}: DeployConfigEditorProps) {
  function update(partial: Partial<DeployConfig>) {
    onChange({ ...config, ...partial });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">App Name</Label>
          <Input
            value={config.name}
            onChange={(e) => update({ name: e.target.value })}
            className="h-9"
          />
        </div>
        <NamespaceSelectorWithCreate
          clusterId={clusterId}
          value={config.namespace}
          onChange={(namespace) => update({ namespace })}
        />
      </div>

      {showImage && !buildMode && (
        <div className="space-y-1.5">
          <Label className="text-xs">Container Image</Label>
          <Input
            value={config.image}
            onChange={(e) => update({ image: e.target.value })}
            placeholder="ghcr.io/owner/app:latest"
            className="h-9 font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Provide the image URL. The dashboard does not build images.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Port</Label>
          <Input
            type="number"
            value={config.port}
            onChange={(e) => update({ port: Number(e.target.value) })}
            min={1}
            max={65535}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Replicas</Label>
          <Input
            type="number"
            value={config.replicas}
            onChange={(e) => update({ replicas: Number(e.target.value) })}
            min={1}
            max={20}
            className="h-9"
          />
        </div>
      </div>

      <EnvVarsEditor envVars={config.envVars} onChange={(envVars) => update({ envVars })} />

      {showIngress && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Switch
              id="ingress-toggle"
              checked={config.ingressEnabled}
              onCheckedChange={(checked) => update({ ingressEnabled: checked })}
            />
            <Label htmlFor="ingress-toggle" className="cursor-pointer text-sm">
              Enable Ingress
            </Label>
          </div>
          {config.ingressEnabled && (
            <div className="space-y-1.5">
              <Label className="text-xs">Ingress Host</Label>
              <Input
                value={config.ingressHost}
                onChange={(e) => update({ ingressHost: e.target.value })}
                placeholder="app.example.com"
                className="h-9"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

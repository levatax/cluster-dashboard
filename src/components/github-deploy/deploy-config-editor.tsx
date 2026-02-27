"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}

export function DeployConfigEditor({ clusterId, config, onChange, showImage = true, buildMode = false }: DeployConfigEditorProps) {
  function update(partial: Partial<DeployConfig>) {
    onChange({ ...config, ...partial });
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label>App Name</Label>
          <Input value={config.name} onChange={(e) => update({ name: e.target.value })} />
        </div>
        <NamespaceSelectorWithCreate
          clusterId={clusterId}
          value={config.namespace}
          onChange={(namespace) => update({ namespace })}
        />
      </div>

      {showImage && !buildMode && (
        <div className="grid gap-1.5">
          <Label>Container Image</Label>
          <Input
            value={config.image}
            onChange={(e) => update({ image: e.target.value })}
            placeholder="ghcr.io/owner/app:latest"
          />
          <p className="text-xs text-muted-foreground">
            Provide the image URL. The dashboard does not build images.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label>Port</Label>
          <Input
            type="number"
            value={config.port}
            onChange={(e) => update({ port: Number(e.target.value) })}
            min={1}
            max={65535}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Replicas</Label>
          <Input
            type="number"
            value={config.replicas}
            onChange={(e) => update({ replicas: Number(e.target.value) })}
            min={1}
            max={20}
          />
        </div>
      </div>

      <EnvVarsEditor
        envVars={config.envVars}
        onChange={(envVars) => update({ envVars })}
      />

      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.ingressEnabled}
            onChange={(e) => update({ ingressEnabled: e.target.checked })}
            className="rounded border-border"
          />
          <span className="text-sm">Enable Ingress</span>
        </label>

        {config.ingressEnabled && (
          <div className="grid gap-1.5">
            <Label>Ingress Host</Label>
            <Input
              value={config.ingressHost}
              onChange={(e) => update({ ingressHost: e.target.value })}
              placeholder="app.example.com"
            />
          </div>
        )}
      </div>
    </div>
  );
}

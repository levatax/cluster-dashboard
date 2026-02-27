"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NamespaceSelectorWithCreate } from "@/components/namespace-selector-with-create";
import { EnvVarsEditor, type EnvVar } from "@/components/github-deploy/env-vars-editor";
import { DockerhubDeploymentsList } from "./dockerhub-deployments-list";
import {
  deployFromDockerhub,
  fetchDockerhubDeployments,
  removeDockerhubDeployment,
  searchDockerhub,
  type DockerHubSearchResult,
} from "@/app/actions/dockerhub-deploy";
import { Loader2, Rocket, Box, Search } from "lucide-react";
import { toast } from "sonner";
import type { DockerhubDeploymentRow } from "@/lib/db";

interface DockerhubDeployPageProps {
  clusterId: string;
}

export function DockerhubDeployPage({ clusterId }: DockerhubDeployPageProps) {
  const [deployments, setDeployments] = useState<DockerhubDeploymentRow[]>([]);
  const [deploying, setDeploying] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DockerHubSearchResult[]>([]);

  const [config, setConfig] = useState({
    name: "",
    namespace: "default",
    image: "",
    tag: "latest",
    port: 80,
    replicas: 1,
    ingressEnabled: false,
    ingressHost: "",
    envVars: [] as EnvVar[],
  });

  useEffect(() => {
    fetchDockerhubDeployments(clusterId).then((r) => {
      if (r.success) setDeployments(r.data);
    });
  }, [clusterId]);

  function update(partial: Partial<typeof config>) {
    setConfig((prev) => ({ ...prev, ...partial }));
  }

  // Auto-generate app name from image
  function handleImageChange(image: string) {
    update({ image });
    if (!config.name || config.name === deriveNameFromImage(config.image)) {
      const derivedName = deriveNameFromImage(image);
      update({ name: derivedName });
    }
  }

  function deriveNameFromImage(image: string): string {
    // Extract image name from full path (e.g., "nginx" from "library/nginx" or "myuser/myapp")
    const parts = image.split("/");
    const imageName = parts[parts.length - 1].split(":")[0];
    return imageName.toLowerCase().replace(/[^a-z0-9-]/g, "-") || "";
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const result = await searchDockerhub(searchQuery);
    if (result.success) {
      setSearchResults(result.data);
    } else {
      toast.error(result.error);
    }
    setSearching(false);
  }

  function selectSearchResult(result: DockerHubSearchResult) {
    handleImageChange(result.repo_name);
    setSearchResults([]);
    setSearchQuery("");
  }

  async function handleDeploy() {
    if (!config.image || !config.name) {
      toast.error("Image and App Name are required");
      return;
    }

    setDeploying(true);
    const result = await deployFromDockerhub(clusterId, {
      name: config.name,
      namespace: config.namespace,
      image: config.image,
      tag: config.tag,
      port: config.port,
      replicas: config.replicas,
      envVars: config.envVars,
      ingressEnabled: config.ingressEnabled,
      ingressHost: config.ingressHost,
    });

    if (result.success) {
      toast.success("Deployed successfully");
      setConfig({
        name: "",
        namespace: "default",
        image: "",
        tag: "latest",
        port: 80,
        replicas: 1,
        ingressEnabled: false,
        ingressHost: "",
        envVars: [],
      });
      const r = await fetchDockerhubDeployments(clusterId);
      if (r.success) setDeployments(r.data);
    } else {
      toast.error(result.error);
    }
    setDeploying(false);
  }

  async function handleRemove(id: string) {
    const result = await removeDockerhubDeployment(clusterId, id);
    if (result.success) {
      toast.success("Deployment removed");
      const r = await fetchDockerhubDeployments(clusterId);
      if (r.success) setDeployments(r.data);
    } else {
      toast.error(result.error);
    }
  }

  const canDeploy = config.image && config.name;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Deploy from Docker Hub</h2>
        <p className="text-sm text-muted-foreground">
          Search Docker Hub or enter an image name directly to deploy
        </p>
      </div>

      {/* Docker Hub Search */}
      <div className="space-y-3">
        <Label>Search Docker Hub</Label>
        <div className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for images (e.g., nginx, redis, postgres)"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button variant="outline" onClick={handleSearch} disabled={searching}>
            {searching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="rounded-lg border border-border divide-y divide-border max-h-64 overflow-auto">
            {searchResults.map((result) => (
              <button
                key={result.repo_name}
                onClick={() => selectSearchResult(result)}
                className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
              >
                <Box className="size-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {result.repo_name}
                    </span>
                    {result.is_official && (
                      <span className="shrink-0 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                        Official
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {result.short_description || "No description"}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span>{result.star_count?.toLocaleString() || 0} stars</span>
                    <span>{result.pull_count?.toLocaleString() || 0} pulls</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Manual Image Input */}
      <div className="space-y-4 rounded-lg border border-border p-4">
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Image Name</Label>
              <Input
                value={config.image}
                onChange={(e) => handleImageChange(e.target.value)}
                placeholder="nginx, redis, myuser/myapp"
              />
              <p className="text-xs text-muted-foreground">
                Use short names for official images or owner/repo for others
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label>Tag</Label>
              <Input
                value={config.tag}
                onChange={(e) => update({ tag: e.target.value })}
                placeholder="latest"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>App Name</Label>
              <Input
                value={config.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="my-app"
              />
            </div>
            <NamespaceSelectorWithCreate
              clusterId={clusterId}
              value={config.namespace}
              onChange={(namespace) => update({ namespace })}
            />
          </div>

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

        <Button onClick={handleDeploy} disabled={deploying || !canDeploy} className="w-full">
          {deploying ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <Rocket className="mr-1.5 size-4" />
          )}
          {deploying ? "Deploying..." : "Deploy"}
        </Button>
      </div>

      {deployments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Previous Deployments</h3>
          <DockerhubDeploymentsList deployments={deployments} onRemove={handleRemove} />
        </div>
      )}
    </div>
  );
}


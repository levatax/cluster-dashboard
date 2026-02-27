"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
import {
  Loader2,
  Rocket,
  Box,
  Search,
  Star,
  Download,
  Globe,
  Settings2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { DockerhubDeploymentRow } from "@/lib/db";

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <span className="text-sm font-medium">{title}</span>
      <Separator className="flex-1" />
    </div>
  );
}

// ─── Search result row ────────────────────────────────────────────────────────

function SearchResultRow({
  result,
  onSelect,
}: {
  result: DockerHubSearchResult;
  onSelect: (r: DockerHubSearchResult) => void;
}) {
  return (
    <button
      onClick={() => onSelect(result)}
      className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
        <Box className="size-3.5 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{result.repo_name}</span>
          {result.is_official && (
            <span className="shrink-0 rounded border border-blue-500/30 bg-blue-500/10 px-1.5 text-[10px] font-medium text-blue-700 dark:text-blue-400">
              Official
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
          {result.short_description || "No description"}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-0.5">
          <Star className="size-3" />
          {(result.star_count ?? 0).toLocaleString()}
        </span>
        <span className="flex items-center gap-0.5">
          <Download className="size-3" />
          {(result.pull_count ?? 0).toLocaleString()}
        </span>
      </div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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

  function deriveNameFromImage(image: string): string {
    const parts = image.split("/");
    const imageName = parts[parts.length - 1].split(":")[0];
    return imageName.toLowerCase().replace(/[^a-z0-9-]/g, "-") || "";
  }

  function handleImageChange(image: string) {
    update({ image });
    if (!config.name || config.name === deriveNameFromImage(config.image)) {
      const derived = deriveNameFromImage(image);
      update({ name: derived });
    }
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

  const canDeploy = !!(config.image && config.name);

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h2 className="text-base font-semibold">Deploy from Docker Hub</h2>
        <p className="text-sm text-muted-foreground">
          Search for a public image and deploy it to this cluster
        </p>
      </div>

      {/* ── Deploy form ─────────────────────────────────────────────────────── */}
      <div className="space-y-6">

        {/* Section: Image */}
        <div className="space-y-4">
          <SectionLabel icon={Box} title="Image" />

          {/* Search bar */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search Docker Hub (e.g. nginx, redis, postgres)…"
                  className="pl-9"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
                    onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>
              <Button
                variant="outline"
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="shrink-0"
              >
                {searching ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
              </Button>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="divide-y overflow-hidden rounded-lg border">
                {searchResults.map((r) => (
                  <SearchResultRow
                    key={r.repo_name}
                    result={r}
                    onSelect={selectSearchResult}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Image name + tag */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
            <div className="space-y-1.5">
              <Label htmlFor="dh-image">
                Image Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dh-image"
                value={config.image}
                onChange={(e) => handleImageChange(e.target.value)}
                placeholder="nginx  or  myuser/myapp"
              />
              <p className="text-[11px] text-muted-foreground">
                Short name for official images, <span className="font-mono">owner/repo</span> for others
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dh-tag">Tag</Label>
              <Input
                id="dh-tag"
                value={config.tag}
                onChange={(e) => update({ tag: e.target.value })}
                placeholder="latest"
              />
            </div>
          </div>
        </div>

        {/* Section: Application */}
        <div className="space-y-4">
          <SectionLabel icon={Settings2} title="Application" />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dh-name">
                App Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dh-name"
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dh-port">Container Port</Label>
              <Input
                id="dh-port"
                type="number"
                value={config.port}
                onChange={(e) => update({ port: Number(e.target.value) })}
                min={1}
                max={65535}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dh-replicas">Replicas</Label>
              <Input
                id="dh-replicas"
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
        </div>

        {/* Section: Ingress */}
        <div className="space-y-4">
          <SectionLabel icon={Globe} title="Ingress" />

          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Enable Ingress</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Expose this app via an HTTP/S domain
              </p>
            </div>
            <Switch
              checked={config.ingressEnabled}
              onCheckedChange={(v) => update({ ingressEnabled: v })}
            />
          </div>

          {config.ingressEnabled && (
            <div className="space-y-1.5">
              <Label htmlFor="dh-ingress-host">Ingress Host</Label>
              <Input
                id="dh-ingress-host"
                value={config.ingressHost}
                onChange={(e) => update({ ingressHost: e.target.value })}
                placeholder="app.example.com"
              />
            </div>
          )}
        </div>

        {/* Deploy button */}
        <div className="flex justify-end">
          <Button
            onClick={handleDeploy}
            disabled={deploying || !canDeploy}
            className={cn(!canDeploy && "opacity-50")}
          >
            {deploying ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Rocket className="mr-1.5 size-4" />
            )}
            {deploying ? "Deploying…" : "Deploy"}
          </Button>
        </div>
      </div>

      {/* ── Previous deployments ─────────────────────────────────────────────── */}
      {deployments.length > 0 && (
        <>
          <div className="border-t" />
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Previous Deployments</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Deployments made from Docker Hub on this cluster
              </p>
            </div>
            <DockerhubDeploymentsList
              deployments={deployments}
              onRemove={handleRemove}
            />
          </div>
        </>
      )}
    </div>
  );
}

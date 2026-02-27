"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppDetailDialog } from "@/components/app-store/app-detail-dialog";
import { AppStatusBadge } from "@/components/app-store/app-status-badge";
import {
  fetchInstalledApps,
  fetchCatalogApps,
  installCatalogApp,
  checkHelmAvailable,
} from "@/app/actions/app-store";
import { updateClusterRegistryUrl } from "@/app/actions/kubernetes";
import { FadeIn } from "@/components/motion-primitives";
import type { AppInstallRow } from "@/lib/db";
import type { CatalogCategory, ConfigField } from "@/lib/catalog/types";
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Loader2,
  Package,
  Settings,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CatalogAppView = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: CatalogCategory;
  version: string;
  versions: string[];
  website?: string;
  configFields: ConfigField[];
  helmChart?: { repo: string; repoUrl: string; chart: string };
};

interface RegistrySetupWizardProps {
  clusterId: string;
  registryUrl: string | null;
  onRegistryConfigured: (url: string) => void;
}

// Inline code block with copy button for multi-line config content
function CodeBlock({ content, label }: { content: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-1">
      {label && (
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      )}
      <div className="group relative">
        <pre className="rounded-md bg-muted px-3 py-2 pr-10 font-mono text-xs overflow-x-auto whitespace-pre">
          {content}
        </pre>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 size-7 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="size-3.5 text-green-500" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function RegistrySetupWizard({
  clusterId,
  registryUrl,
  onRegistryConfigured,
}: RegistrySetupWizardProps) {
  const [registryInstall, setRegistryInstall] = useState<AppInstallRow | null>(null);
  const [catalogApp, setCatalogApp] = useState<CatalogAppView | null>(null);
  const [helmAvailable, setHelmAvailable] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [skipInstall, setSkipInstall] = useState(false);
  const [nodesConfigured, setNodesConfigured] = useState(false);
  const [urlInput, setUrlInput] = useState(registryUrl ?? "");
  const [expanded, setExpanded] = useState(!registryUrl);
  const [loading, setLoading] = useState(true);
  const [savingUrl, setSavingUrl] = useState(false);

  const deriveUrl = useCallback(
    (install: AppInstallRow) =>
      `${install.release_name}.${install.namespace}.svc.cluster.local:5000`,
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);

      const [installedRes, catalogRes, helmRes] = await Promise.all([
        fetchInstalledApps(clusterId),
        fetchCatalogApps(),
        checkHelmAvailable(),
      ]);

      if (cancelled) return;

      if (installedRes.success) {
        const registryApp = installedRes.data.find(
          (a) => a.catalog_app_id === "container-registry"
        );
        if (registryApp) {
          setRegistryInstall(registryApp);
          if (!registryUrl) {
            setUrlInput(deriveUrl(registryApp));
          }
        }
      }

      if (catalogRes.success) {
        const app = catalogRes.data.find((a) => a.id === "container-registry") ?? null;
        setCatalogApp(app as CatalogAppView | null);
      }

      if (helmRes.success) {
        setHelmAvailable(helmRes.data);
      }

      // Read localStorage for node config acknowledgment
      const stored = localStorage.getItem(
        `registry-nodes-configured-${clusterId}`
      );
      if (stored === "true") setNodesConfigured(true);

      setLoading(false);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [clusterId, registryUrl, deriveUrl]);

  // Step completion logic
  const step1Done =
    (registryInstall?.status === "deployed") || skipInstall;
  const step2Done = nodesConfigured;
  const step3Done = !!registryUrl;

  // Internal DNS used by Kaniko (runs as a pod, can resolve cluster DNS)
  const registryServiceUrl =
    registryInstall && registryInstall.status === "deployed"
      ? deriveUrl(registryInstall)
      : urlInput || "container-registry.registry.svc.cluster.local:5000";

  // NodePort endpoint used by node containerd (can't resolve cluster DNS)
  const nodePort =
    (registryInstall?.config_values?.nodePort as number) || 30500;
  const nodeEndpoint = `127.0.0.1:${nodePort}`;

  async function handleInstall(
    appId: string,
    config: Record<string, unknown>,
    deployMethod: "manifest" | "helm"
  ) {
    const result = await installCatalogApp(clusterId, appId, config, deployMethod);
    if (result.success) {
      setRegistryInstall(result.data);
      const url = deriveUrl(result.data);
      setUrlInput(url);

      // Auto-save URL to cluster
      const saveRes = await updateClusterRegistryUrl(clusterId, url);
      if (saveRes.success) {
        onRegistryConfigured(url);
      }

      toast.success("Container Registry installed");
    } else {
      toast.error(result.error);
    }
  }

  function handleNodesConfigured() {
    setNodesConfigured(true);
    localStorage.setItem(`registry-nodes-configured-${clusterId}`, "true");
  }

  async function handleSaveUrl() {
    const url = urlInput.trim();
    if (!url) return;
    setSavingUrl(true);
    const result = await updateClusterRegistryUrl(clusterId, url);
    if (result.success) {
      onRegistryConfigured(url);
      setExpanded(false);
      toast.success("Registry URL saved");
    } else {
      toast.error(result.error);
    }
    setSavingUrl(false);
  }

  // Collapsed state: compact indicator row
  if (!expanded && registryUrl) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2">
        <CheckCircle2 className="size-4 text-green-500 shrink-0" />
        <span className="text-sm text-muted-foreground">
          Building to:{" "}
          <span className="font-mono text-xs text-foreground">
            {registryUrl}
          </span>
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 text-xs"
          onClick={() => setExpanded(true)}
        >
          <Settings className="size-3.5 mr-1" />
          Setup
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-4 py-6">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Checking registry status...
        </span>
      </div>
    );
  }

  return (
    <FadeIn>
      <Card>
        <CardContent className="pt-5 pb-5 space-y-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">Registry Setup</h3>
              <p className="text-xs text-muted-foreground">
                Configure an in-cluster registry to build and push images
              </p>
            </div>
            {registryUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setExpanded(false)}
              >
                <ChevronUp className="size-3.5 mr-1" />
                Collapse
              </Button>
            )}
          </div>

          {/* Steps */}
          <div className="space-y-0">
            {/* Step 1: Install Container Registry */}
            <Step
              number={1}
              title="Install Container Registry"
              done={step1Done}
              active={!step1Done}
              isLast={false}
            >
              {registryInstall?.status === "deployed" ? (
                <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <span className="text-sm font-medium">
                      Container Registry
                    </span>
                    <AppStatusBadge status="deployed" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    {registryInstall.release_name}.
                    {registryInstall.namespace}
                  </p>
                </div>
              ) : registryInstall?.status === "failed" ? (
                <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="size-4 text-red-500 shrink-0" />
                    <span className="text-sm font-medium">
                      Container Registry
                    </span>
                    <AppStatusBadge status="failed" />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 ml-6 h-7 text-xs"
                    onClick={() => setDialogOpen(true)}
                  >
                    Retry
                  </Button>
                </div>
              ) : registryInstall?.status === "deploying" ? (
                <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="size-4 text-blue-500 animate-spin shrink-0" />
                    <span className="text-sm font-medium">
                      Container Registry
                    </span>
                    <AppStatusBadge status="deploying" />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div
                    className="rounded-md border border-border/50 p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setDialogOpen(true)}
                  >
                    <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-lg">
                      <Package className="size-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          Container Registry
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                        >
                          v2
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        Docker registry for storing container images in-cluster
                      </p>
                    </div>
                    <Button size="sm" className="h-7 text-xs shrink-0">
                      Install
                    </Button>
                  </div>
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground underline transition-colors ml-1"
                    onClick={() => setSkipInstall(true)}
                  >
                    I already have a registry
                  </button>
                </div>
              )}
            </Step>

            {/* Step 2: Configure Cluster Nodes */}
            <Step
              number={2}
              title="Configure Cluster Nodes"
              done={step2Done}
              active={step1Done && !step2Done}
              isLast={false}
            >
              <div
                className={cn(
                  "transition-opacity",
                  !step1Done && "opacity-50 pointer-events-none"
                )}
              >
                <p className="text-xs text-muted-foreground mb-3">
                  Nodes can&apos;t resolve cluster-internal DNS
                  (<code className="text-[10px]">.svc.cluster.local</code>), so
                  the registry is exposed via NodePort{" "}
                  <code className="text-[10px]">{nodePort}</code>. The config
                  below tells containerd to reach{" "}
                  <code className="text-[10px]">{nodeEndpoint}</code> when
                  pulling images tagged with the internal service name. Run on{" "}
                  <strong>every node</strong>.
                </p>
                <Tabs defaultValue="k3s" className="w-full">
                  <TabsList className="h-8">
                    <TabsTrigger value="k3s" className="text-xs h-6">
                      k3s
                    </TabsTrigger>
                    <TabsTrigger value="containerd" className="text-xs h-6">
                      containerd
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="k3s" className="space-y-3 mt-3">
                    <CodeBlock
                      label="Create the config directory (needed on worker nodes)"
                      content="sudo mkdir -p /etc/rancher/k3s"
                    />
                    <CodeBlock
                      label="Write /etc/rancher/k3s/registries.yaml"
                      content={`sudo tee /etc/rancher/k3s/registries.yaml <<EOF
mirrors:
  "${registryServiceUrl}":
    endpoint:
      - "http://${nodeEndpoint}"
EOF`}
                    />
                    <CodeBlock
                      label="Restart k3s (master nodes)"
                      content="sudo systemctl restart k3s"
                    />
                    <CodeBlock
                      label="Restart k3s-agent (worker nodes)"
                      content="sudo systemctl restart k3s-agent"
                    />
                  </TabsContent>
                  <TabsContent value="containerd" className="space-y-3 mt-3">
                    <CodeBlock
                      label="Create the config directory"
                      content={`sudo mkdir -p /etc/containerd/certs.d/${registryServiceUrl}`}
                    />
                    <CodeBlock
                      label={`Write /etc/containerd/certs.d/${registryServiceUrl}/hosts.toml`}
                      content={`sudo tee /etc/containerd/certs.d/${registryServiceUrl}/hosts.toml <<EOF
server = "http://${nodeEndpoint}"

[host."http://${nodeEndpoint}"]
  capabilities = ["pull", "resolve", "push"]
  skip_verify = true
EOF`}
                    />
                    <CodeBlock
                      label="Restart containerd"
                      content="sudo systemctl restart containerd"
                    />
                  </TabsContent>
                </Tabs>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 h-7 text-xs"
                  onClick={handleNodesConfigured}
                  disabled={!step1Done}
                >
                  <Check className="size-3.5 mr-1" />
                  I&apos;ve configured my nodes
                </Button>
              </div>
            </Step>

            {/* Step 3: Save Registry URL */}
            <Step
              number={3}
              title="Save Registry URL"
              done={step3Done}
              active={step1Done && step2Done && !step3Done}
              isLast={true}
            >
              <div
                className={cn(
                  "transition-opacity",
                  !step2Done && "opacity-50 pointer-events-none"
                )}
              >
                <div className="space-y-2">
                  <Label className="text-xs">Registry service URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="container-registry.registry.svc.cluster.local:5000"
                      className="flex-1 font-mono text-xs"
                      disabled={!step2Done}
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveUrl}
                      disabled={savingUrl || !urlInput.trim() || !step2Done}
                    >
                      {savingUrl ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Save className="size-3.5 mr-1" />
                      )}
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </Step>
          </div>
        </CardContent>
      </Card>

      {/* AppDetailDialog for installing container registry */}
      <AppDetailDialog
        app={catalogApp}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onInstall={handleInstall}
        helmAvailable={helmAvailable}
        clusterId={clusterId}
      />
    </FadeIn>
  );
}

// Step component for the vertical stepper
function Step({
  number,
  title,
  done,
  active,
  isLast,
  children,
}: {
  number: number;
  title: string;
  done: boolean;
  active: boolean;
  isLast: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      {/* Step indicator column */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
            done
              ? "border-emerald-500 bg-emerald-500 text-white"
              : active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/30 text-muted-foreground"
          )}
        >
          {done ? <Check className="size-3.5" /> : number}
        </div>
        {!isLast && (
          <div
            className={cn(
              "w-0.5 flex-1 min-h-4 transition-colors",
              done ? "bg-emerald-500" : "bg-muted-foreground/20"
            )}
          />
        )}
      </div>

      {/* Step content */}
      <div className={cn("flex-1 pb-5", isLast && "pb-0")}>
        <p
          className={cn(
            "text-sm font-medium mb-2 mt-0.5",
            !done && !active && "text-muted-foreground"
          )}
        >
          {title}
        </p>
        {children}
      </div>
    </div>
  );
}

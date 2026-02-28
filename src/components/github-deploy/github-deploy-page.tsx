"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { RepoInputForm } from "./repo-input-form";
import { DeployPreview } from "./deploy-preview";
import { RegistrySetupWizard } from "./registry-setup-wizard";
import { DeployConfigEditor } from "./deploy-config-editor";
import { GithubDeploymentsList } from "./github-deployments-list";
import { BuildProgress } from "./build-progress";
import { SaveTemplateDialog } from "@/components/templates/save-template-dialog";
import { TemplateSelectorDialog } from "@/components/templates/template-selector-dialog";
import type { DeploymentTemplateConfig } from "@/app/actions/deployment-templates";
import {
  analyzeGithubRepo,
  deployFromGithub,
  fetchGithubDeployments,
  removeGithubDeployment,
  rebuildGithubDeployment,
  startBuildAction,
  getBuildStatusAction,
  getBuildLogsAction,
  type RepoAnalysis,
} from "@/app/actions/github-deploy";
import { fetchClusterRegistryUrl } from "@/app/actions/kubernetes";
import { Loader2, Rocket, Hammer, FileCode2, GitBranch, Settings2, Globe } from "lucide-react";
import { toast } from "sonner";
import type { GithubDeploymentRow } from "@/lib/db";

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

// ─── Main component ───────────────────────────────────────────────────────────

interface GithubDeployPageProps {
  clusterId: string;
}

type BuildPhase = "idle" | "building" | "succeeded" | "failed";

export function GithubDeployPage({ clusterId }: GithubDeployPageProps) {
  const [deployments, setDeployments] = useState<GithubDeploymentRow[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [analysis, setAnalysis] = useState<RepoAnalysis | null>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [repoBranch, setRepoBranch] = useState("");
  const [repoToken, setRepoToken] = useState<string | null>(null);

  const [config, setConfig] = useState({
    name: "",
    namespace: "default",
    image: "",
    port: 3000,
    replicas: 1,
    ingressEnabled: false,
    ingressHost: "",
    envVars: [] as { key: string; value: string; isSecret: boolean }[],
  });

  const [registryUrl, setRegistryUrl] = useState<string | null>(null);
  const [buildPhase, setBuildPhase] = useState<BuildPhase>("idle");
  const [buildJobName, setBuildJobName] = useState("");
  const [buildImage, setBuildImage] = useState("");
  const [buildLogs, setBuildLogs] = useState("");
  const [buildMessage, setBuildMessage] = useState("");
  const [rebuildingId, setRebuildingId] = useState<string | null>(null);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [lastDeployedConfig, setLastDeployedConfig] =
    useState<DeploymentTemplateConfig | null>(null);

  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (statusPollRef.current) { clearInterval(statusPollRef.current); statusPollRef.current = null; }
    if (logsPollRef.current) { clearInterval(logsPollRef.current); logsPollRef.current = null; }
  }

  useEffect(() => {
    fetchGithubDeployments(clusterId).then((r) => {
      if (r.success) setDeployments(r.data);
    });
    fetchClusterRegistryUrl(clusterId).then((r) => {
      if (r.success) setRegistryUrl(r.data);
    });
  }, [clusterId]);

  useEffect(() => () => stopPolling(), []);

  const isDockerfile = analysis?.deployType.type === "dockerfile";
  const hasBuildMode = isDockerfile && !!registryUrl;
  const needsImage = analysis?.deployType.type !== "kubernetes-manifests";
  const needsManualImage = needsImage && !hasBuildMode;
  const showConfig = !!analysis && analysis.deployType.type !== "kubernetes-manifests";
  const canDeploy =
    analysis &&
    config.name &&
    buildPhase !== "building" &&
    (needsManualImage ? config.image : true);

  async function handleAnalyze(url: string, branch: string, token: string | null) {
    setAnalyzing(true);
    setRepoUrl(url);
    setRepoBranch(branch);
    setRepoToken(token);
    setAnalysis(null);
    setBuildPhase("idle");
    setBuildLogs("");

    const result = await analyzeGithubRepo(url, branch || undefined, token);
    if (result.success) {
      setAnalysis(result.data);
      const { repoInfo, deployType } = result.data;
      setRepoBranch(branch || repoInfo.defaultBranch);
      const appName = repoInfo.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      setConfig((prev) => ({
        ...prev,
        name: appName,
        port: deployType.type === "dockerfile" && deployType.port ? deployType.port : prev.port,
      }));
    } else {
      toast.error(result.error);
    }
    setAnalyzing(false);
  }

  async function runDeploy(imageOverride?: string) {
    if (!analysis) return;
    setDeploying(true);

    const deployType = analysis.deployType;
    const manifestPaths =
      deployType.type === "kubernetes-manifests" ? deployType.paths : undefined;
    const imageToUse = imageOverride || config.image;

    const result = await deployFromGithub(clusterId, repoUrl, repoBranch, repoToken, {
      name: config.name,
      namespace: config.namespace,
      image: imageToUse,
      port: config.port,
      replicas: config.replicas,
      ingressEnabled: config.ingressEnabled,
      ingressHost: config.ingressHost,
      envVars: config.envVars,
      manifestPaths,
    });

    if (result.success) {
      const deployedConfig: DeploymentTemplateConfig = {
        name: config.name,
        namespace: config.namespace,
        image: imageToUse,
        port: config.port,
        replicas: config.replicas,
        ingressEnabled: config.ingressEnabled,
        ingressHost: config.ingressHost,
        envVars: config.envVars,
        repoUrl,
        branch: repoBranch,
      };
      setLastDeployedConfig(deployedConfig);

      toast.success("Deployed successfully", {
        action: {
          label: "Save as Template",
          onClick: () => setSaveTemplateOpen(true),
        },
      });

      setAnalysis(null);
      setBuildPhase("idle");
      const r = await fetchGithubDeployments(clusterId);
      if (r.success) setDeployments(r.data);
    } else {
      toast.error(result.error);
    }
    setDeploying(false);
  }

  async function handleBuildAndDeploy() {
    if (!analysis) return;
    setBuildPhase("building");
    setBuildLogs("");
    setBuildMessage("");
    stopPolling();

    const result = await startBuildAction(clusterId, repoUrl, repoBranch, repoToken, {
      appName: config.name,
      namespace: config.namespace,
      envVars: config.envVars,
    });

    if (!result.success) {
      setBuildPhase("failed");
      setBuildMessage(result.error);
      return;
    }

    const { jobName, image } = result.data;
    setBuildJobName(jobName);
    setBuildImage(image);

    statusPollRef.current = setInterval(async () => {
      const statusResult = await getBuildStatusAction(clusterId, config.namespace, jobName);
      if (!statusResult.success) return;
      const { phase } = statusResult.data;
      if (phase === "succeeded") {
        stopPolling();
        setBuildPhase("succeeded");
        await runDeploy(image);
      } else if (phase === "failed") {
        stopPolling();
        setBuildPhase("failed");
        setBuildMessage(statusResult.data.message || "Build failed");
      }
    }, 3000);

    logsPollRef.current = setInterval(async () => {
      const logsResult = await getBuildLogsAction(clusterId, config.namespace, jobName);
      if (logsResult.success) setBuildLogs(logsResult.data);
    }, 5000);
  }

  async function handleDeploy() {
    if (hasBuildMode) await handleBuildAndDeploy();
    else await runDeploy();
  }

  async function handleRemove(id: string) {
    const result = await removeGithubDeployment(clusterId, id);
    if (result.success) {
      toast.success("Deployment removed");
      const r = await fetchGithubDeployments(clusterId);
      if (r.success) setDeployments(r.data);
    } else {
      toast.error(result.error);
    }
  }

  async function handleRebuild(id: string) {
    setRebuildingId(id);
    const result = await rebuildGithubDeployment(clusterId, id);
    if (result.success && result.data) {
      // Build was started — poll for completion
      const { jobName, image } = result.data;
      const deployment = deployments.find((d) => d.id === id);
      const ns = deployment?.namespace || "default";

      setBuildPhase("building");
      setBuildJobName(jobName);
      setBuildImage(image);
      setBuildLogs("");
      setBuildMessage("");
      stopPolling();

      statusPollRef.current = setInterval(async () => {
        const statusResult = await getBuildStatusAction(clusterId, ns, jobName);
        if (!statusResult.success) return;
        const { phase } = statusResult.data;
        if (phase === "succeeded") {
          stopPolling();
          setBuildPhase("succeeded");
          // Re-apply manifests with the new image
          const redeployResult = await deployFromGithub(clusterId,
            deployment!.repo_url, deployment!.branch, deployment!.github_token, {
              ...(deployment!.deploy_config as Record<string, string | number | boolean>),
              name: deployment!.release_name,
              namespace: ns,
              image,
              port: (deployment!.deploy_config as { port?: number }).port || 3000,
              replicas: (deployment!.deploy_config as { replicas?: number }).replicas || 1,
            });
          if (redeployResult.success) {
            toast.success("Rebuild & deploy succeeded");
          } else {
            toast.error(redeployResult.error);
          }
          setRebuildingId(null);
          const r = await fetchGithubDeployments(clusterId);
          if (r.success) setDeployments(r.data);
        } else if (phase === "failed") {
          stopPolling();
          setBuildPhase("failed");
          setBuildMessage(statusResult.data.message || "Build failed");
          setRebuildingId(null);
          const r = await fetchGithubDeployments(clusterId);
          if (r.success) setDeployments(r.data);
        }
      }, 3000);

      logsPollRef.current = setInterval(async () => {
        const logsResult = await getBuildLogsAction(clusterId, ns, jobName);
        if (logsResult.success) setBuildLogs(logsResult.data);
      }, 5000);
    } else if (result.success) {
      // Manifest-based redeploy completed immediately
      toast.success("Redeployed successfully");
      setRebuildingId(null);
      const r = await fetchGithubDeployments(clusterId);
      if (r.success) setDeployments(r.data);
    } else {
      toast.error(result.error);
      setRebuildingId(null);
      const r = await fetchGithubDeployments(clusterId);
      if (r.success) setDeployments(r.data);
    }
  }

  function handleTemplateSelect(templateConfig: DeploymentTemplateConfig) {
    setConfig({
      name: templateConfig.name,
      namespace: templateConfig.namespace,
      image: templateConfig.image || "",
      port: templateConfig.port,
      replicas: templateConfig.replicas,
      ingressEnabled: templateConfig.ingressEnabled,
      ingressHost: templateConfig.ingressHost || "",
      envVars: templateConfig.envVars || [],
    });

    if (templateConfig.repoUrl) {
      setRepoUrl(templateConfig.repoUrl);
      setRepoBranch(templateConfig.branch || "main");
      handleAnalyze(templateConfig.repoUrl, templateConfig.branch || "", null);
    }

    toast.success("Template loaded");
  }

  void buildJobName;

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Deploy from GitHub</h2>
          <p className="text-sm text-muted-foreground">
            Analyze a repository and deploy it to this cluster
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => setTemplateSelectorOpen(true)}
        >
          <FileCode2 className="mr-1.5 size-3.5" />
          Use Template
        </Button>
      </div>

      {/* ── Deploy form ──────────────────────────────────────────────────────── */}
      <div className="space-y-6">

        {/* Section: Repository */}
        <div className="space-y-4">
          <SectionLabel icon={GitBranch} title="Repository" />
          <RepoInputForm onAnalyze={handleAnalyze} loading={analyzing} />
          {analysis && (
            <>
              <DeployPreview analysis={analysis} />
              {isDockerfile && (
                <RegistrySetupWizard
                  clusterId={clusterId}
                  registryUrl={registryUrl}
                  onRegistryConfigured={(url) => setRegistryUrl(url)}
                />
              )}
            </>
          )}
        </div>

        {/* Section: Configuration (after analysis, non-manifests only) */}
        {showConfig && (
          <div className="space-y-4">
            <SectionLabel icon={Settings2} title="Configuration" />
            <DeployConfigEditor
              clusterId={clusterId}
              config={config}
              onChange={setConfig}
              showImage={needsImage}
              buildMode={hasBuildMode}
              showIngress={false}
            />
          </div>
        )}

        {/* Section: Ingress (after analysis, non-manifests only) */}
        {showConfig && (
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
                onCheckedChange={(v) => setConfig((prev) => ({ ...prev, ingressEnabled: v }))}
              />
            </div>

            {config.ingressEnabled && (
              <div className="space-y-1.5">
                <Label htmlFor="gh-ingress-host">Ingress Host</Label>
                <Input
                  id="gh-ingress-host"
                  value={config.ingressHost}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, ingressHost: e.target.value }))
                  }
                  placeholder="app.example.com"
                />
              </div>
            )}
          </div>
        )}

        {/* Build progress (Dockerfile + registry mode, or rebuild) */}
        {((analysis && isDockerfile && hasBuildMode) || (rebuildingId && buildPhase !== "idle")) && (
          <BuildProgress
            phase={buildPhase}
            logs={buildLogs}
            image={buildImage}
            message={buildMessage}
          />
        )}

        {/* Deploy button */}
        {analysis && (
          <div className="flex justify-end">
            <Button
              onClick={handleDeploy}
              disabled={deploying || !canDeploy}
            >
              {buildPhase === "building" || deploying ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : hasBuildMode ? (
                <Hammer className="mr-1.5 size-4" />
              ) : (
                <Rocket className="mr-1.5 size-4" />
              )}
              {buildPhase === "building"
                ? "Building…"
                : deploying
                ? "Deploying…"
                : hasBuildMode
                ? "Build & Deploy"
                : "Deploy"}
            </Button>
          </div>
        )}
      </div>

      {/* ── Previous deployments ──────────────────────────────────────────────── */}
      {deployments.length > 0 && (
        <>
          <div className="border-t" />
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Previous Deployments</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Deployments made from GitHub on this cluster
              </p>
            </div>
            <GithubDeploymentsList
              deployments={deployments}
              onRemove={handleRemove}
              onRebuild={handleRebuild}
              rebuildingId={rebuildingId}
            />
          </div>
        </>
      )}

      {/* Template dialogs */}
      <TemplateSelectorDialog
        open={templateSelectorOpen}
        onOpenChange={setTemplateSelectorOpen}
        sourceType="github"
        onSelect={handleTemplateSelect}
      />

      {lastDeployedConfig && (
        <SaveTemplateDialog
          open={saveTemplateOpen}
          onOpenChange={setSaveTemplateOpen}
          config={lastDeployedConfig}
          sourceType="github"
        />
      )}
    </div>
  );
}

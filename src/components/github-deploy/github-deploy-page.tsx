"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RepoInputForm } from "./repo-input-form";
import { DeployPreview } from "./deploy-preview";
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
  startBuildAction,
  getBuildStatusAction,
  getBuildLogsAction,
  type RepoAnalysis,
} from "@/app/actions/github-deploy";
import { fetchClusterRegistryUrl, updateClusterRegistryUrl } from "@/app/actions/kubernetes";
import { Loader2, Rocket, Hammer, AlertTriangle, Save, CheckCircle2, FileCode2 } from "lucide-react";
import { toast } from "sonner";
import type { GithubDeploymentRow } from "@/lib/db";

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

  // Registry state
  const [registryUrl, setRegistryUrl] = useState<string | null>(null);
  const [registryInput, setRegistryInput] = useState("");
  const [savingRegistry, setSavingRegistry] = useState(false);

  // Build state
  const [buildPhase, setBuildPhase] = useState<BuildPhase>("idle");
  const [buildJobName, setBuildJobName] = useState("");
  const [buildImage, setBuildImage] = useState("");
  const [buildLogs, setBuildLogs] = useState("");
  const [buildMessage, setBuildMessage] = useState("");

  // Template dialogs
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [lastDeployedConfig, setLastDeployedConfig] = useState<DeploymentTemplateConfig | null>(null);

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
      if (r.success) { setRegistryUrl(r.data); setRegistryInput(r.data ?? ""); }
    });
  }, [clusterId]);

  useEffect(() => () => stopPolling(), []);

  // Derived values
  const isDockerfile = analysis?.deployType.type === "dockerfile";
  const hasBuildMode = isDockerfile && !!registryUrl;
  const needsImage = analysis?.deployType.type !== "kubernetes-manifests";
  const needsManualImage = needsImage && !hasBuildMode;
  const canDeploy = analysis && config.name && buildPhase !== "building" && (needsManualImage ? config.image : true);

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
    const manifestPaths = deployType.type === "kubernetes-manifests" ? deployType.paths : undefined;
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
      // Store config for potential template save
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

    // Poll status every 3s
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

    // Poll logs every 5s
    logsPollRef.current = setInterval(async () => {
      const logsResult = await getBuildLogsAction(clusterId, config.namespace, jobName);
      if (logsResult.success) setBuildLogs(logsResult.data);
    }, 5000);
  }

  async function handleDeploy() {
    if (hasBuildMode) {
      await handleBuildAndDeploy();
    } else {
      await runDeploy();
    }
  }

  async function handleSaveRegistry() {
    setSavingRegistry(true);
    const urlToSave = registryInput.trim() || null;
    const result = await updateClusterRegistryUrl(clusterId, urlToSave);
    if (result.success) {
      setRegistryUrl(urlToSave);
      toast.success("Registry URL saved");
    } else {
      toast.error(result.error);
    }
    setSavingRegistry(false);
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

  function handleTemplateSelect(templateConfig: DeploymentTemplateConfig) {
    // Pre-fill the form from template
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

    // If template has repo URL, trigger analysis
    if (templateConfig.repoUrl) {
      setRepoUrl(templateConfig.repoUrl);
      setRepoBranch(templateConfig.branch || "main");
      handleAnalyze(templateConfig.repoUrl, templateConfig.branch || "", null);
    }

    toast.success("Template loaded");
  }

  // suppress unused warning — buildJobName used for polling identity
  void buildJobName;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Deploy from GitHub</h2>
          <p className="text-sm text-muted-foreground">
            Enter a GitHub repository URL to analyze and deploy
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTemplateSelectorOpen(true)}
        >
          <FileCode2 className="mr-1.5 size-4" />
          Use Template
        </Button>
      </div>

      <RepoInputForm onAnalyze={handleAnalyze} loading={analyzing} />

      {analysis && (
        <div className="space-y-4">
          <DeployPreview analysis={analysis} />

          {/* Registry setup prompt for Dockerfile repos without registry configured */}
          {isDockerfile && !registryUrl && (
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-4 text-yellow-500 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                    Registry not configured
                  </p>
                  <p className="text-xs text-muted-foreground">
                    To build the image in-cluster, install Container Registry from the App Store and configure
                    containerd on each node to pull from it. Then enter the registry service URL below.
                    Without a registry, supply the image URL manually.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  value={registryInput}
                  onChange={(e) => setRegistryInput(e.target.value)}
                  placeholder="container-registry.registry.svc.cluster.local:5000"
                  className="flex-1 font-mono text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveRegistry}
                  disabled={savingRegistry || !registryInput.trim()}
                >
                  {savingRegistry ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          )}

          {/* Registry configured indicator */}
          {isDockerfile && registryUrl && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="size-3.5 text-green-500" />
              <span>Building to: <span className="font-mono text-foreground">{registryUrl}</span></span>
              <button
                className="underline ml-1 hover:text-foreground transition-colors"
                onClick={() => { setRegistryUrl(null); setRegistryInput(registryUrl ?? ""); }}
              >
                Change
              </button>
            </div>
          )}

          {analysis.deployType.type !== "kubernetes-manifests" && (
            <DeployConfigEditor
              clusterId={clusterId}
              config={config}
              onChange={setConfig}
              showImage={needsImage}
              buildMode={hasBuildMode}
            />
          )}

          {isDockerfile && hasBuildMode && (
            <BuildProgress
              phase={buildPhase}
              logs={buildLogs}
              image={buildImage}
              message={buildMessage}
            />
          )}

          <Button
            onClick={handleDeploy}
            disabled={deploying || !canDeploy}
            className="w-full"
          >
            {buildPhase === "building" || deploying ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : hasBuildMode ? (
              <Hammer className="mr-1.5 size-4" />
            ) : (
              <Rocket className="mr-1.5 size-4" />
            )}
            {buildPhase === "building"
              ? "Building..."
              : deploying
              ? "Deploying..."
              : hasBuildMode
              ? "Build & Deploy"
              : "Deploy"}
          </Button>
        </div>
      )}

      {deployments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Previous Deployments</h3>
          <GithubDeploymentsList deployments={deployments} onRemove={handleRemove} />
        </div>
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

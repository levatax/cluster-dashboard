"use server";

import yaml from "js-yaml";
import { getClusterById, insertGithubDeployment, getGithubDeployments, updateGithubDeploymentStatus, deleteGithubDeployment, insertDeploymentHistory, getClusterRegistryUrl, type GithubDeploymentRow } from "@/lib/db";
import { parseGitHubUrl, getRepoInfo, detectDeployType, getFileContent, getLatestCommitSha, type DetectedDeployType, type RepoInfo } from "@/lib/github";
import { generateDeploymentManifests, type EnvVar } from "@/lib/manifest-generator";
import { applyResourceYaml, deleteResource, createBuildJob, getBuildJobStatus, getBuildLogs } from "@/lib/kubernetes";
import type * as k8s from "@kubernetes/client-node";
import { requireSession } from "@/lib/auth";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export interface RepoAnalysis {
  repoInfo: RepoInfo;
  deployType: DetectedDeployType;
}

export async function analyzeGithubRepo(
  repoUrl: string,
  branch?: string,
  token?: string | null
): Promise<ActionResult<RepoAnalysis>> {
  try {
    await requireSession();
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) return { success: false, error: "Invalid GitHub URL" };

    const repoInfo = await getRepoInfo(parsed.owner, parsed.repo, token);
    const effectiveBranch = branch || repoInfo.defaultBranch;
    const deployType = await detectDeployType(parsed.owner, parsed.repo, effectiveBranch, token);

    return { success: true, data: { repoInfo, deployType } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to analyze repo" };
  }
}

export type { EnvVar } from "@/lib/manifest-generator";

export async function deployFromGithub(
  clusterId: string,
  repoUrl: string,
  branch: string,
  token: string | null,
  deployConfig: {
    name: string;
    namespace: string;
    image: string;
    port: number;
    replicas: number;
    env?: Record<string, string>;
    envVars?: EnvVar[];
    ingressEnabled?: boolean;
    ingressHost?: string;
    manifestPaths?: string[];
  }
): Promise<ActionResult<GithubDeploymentRow>> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };

    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) return { success: false, error: "Invalid GitHub URL" };

    const deployment = await insertGithubDeployment(
      clusterId, repoUrl, branch, token,
      deployConfig, "manifest",
      deployConfig.name, deployConfig.namespace
    );

    await insertDeploymentHistory(clusterId, "github", deployment.id, "deploy", deployConfig.name, deployConfig.namespace, "deploying", {
      repoUrl, branch,
    });

    try {
      if (deployConfig.manifestPaths && deployConfig.manifestPaths.length > 0) {
        // Apply existing manifest files from repo
        for (const filePath of deployConfig.manifestPaths) {
          const content = await getFileContent(parsed.owner, parsed.repo, filePath, branch, token);
          const docs = yaml.loadAll(content) as k8s.KubernetesObject[];
          for (const doc of docs) {
            if (doc && typeof doc === "object") {
              await applyResourceYaml(cluster.kubeconfig_yaml, doc);
            }
          }
        }
      } else {
        // Generate manifests from config
        const manifestYaml = generateDeploymentManifests({
          name: deployConfig.name,
          namespace: deployConfig.namespace,
          image: deployConfig.image,
          port: deployConfig.port,
          replicas: deployConfig.replicas,
          env: deployConfig.env,
          envVars: deployConfig.envVars,
          ingress: deployConfig.ingressEnabled
            ? { enabled: true, host: deployConfig.ingressHost }
            : undefined,
        });

        const docs = yaml.loadAll(manifestYaml) as k8s.KubernetesObject[];
        for (const doc of docs) {
          if (doc && typeof doc === "object") {
            await applyResourceYaml(cluster.kubeconfig_yaml, doc);
          }
        }
      }

      await updateGithubDeploymentStatus(deployment.id, "deployed");
      await insertDeploymentHistory(clusterId, "github", deployment.id, "deploy", deployConfig.name, deployConfig.namespace, "deployed");
    } catch (deployErr) {
      await updateGithubDeploymentStatus(deployment.id, "failed");
      await insertDeploymentHistory(clusterId, "github", deployment.id, "deploy", deployConfig.name, deployConfig.namespace, "failed", {
        error: deployErr instanceof Error ? deployErr.message : "Deploy failed",
      });
      return { success: false, error: deployErr instanceof Error ? deployErr.message : "Failed to deploy" };
    }

    return { success: true, data: deployment };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to deploy from GitHub" };
  }
}

export async function fetchGithubDeployments(clusterId: string): Promise<ActionResult<GithubDeploymentRow[]>> {
  try {
    await requireSession();
    const deployments = await getGithubDeployments(clusterId);
    return { success: true, data: deployments };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to fetch deployments" };
  }
}

export async function startBuildAction(
  clusterId: string,
  repoUrl: string,
  branch: string,
  token: string | null,
  params: {
    appName: string;
    namespace: string;
    envVars?: { key: string; value: string; isSecret: boolean }[];
  }
): Promise<{ success: true; data: { jobName: string; image: string } } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };

    const registryUrl = await getClusterRegistryUrl(clusterId);
    if (!registryUrl) return { success: false, error: "Registry URL not configured for this cluster" };

    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) return { success: false, error: "Invalid GitHub URL" };

    const sha = await getLatestCommitSha(parsed.owner, parsed.repo, branch, token);
    const safeName = params.appName.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 30);
    const jobName = `build-${safeName}-${sha}`;
    const image = `${registryUrl}/${safeName}:${sha}`;
    const repoHttpsUrl = `https://github.com/${parsed.owner}/${parsed.repo}.git`;

    // Pass env vars as Docker build args so they're available during build
    // (needed for Vite/CRA apps that inline env vars at build time)
    const buildArgs: Record<string, string> = {};
    if (params.envVars) {
      for (const envVar of params.envVars) {
        buildArgs[envVar.key] = envVar.value;
      }
    }

    await createBuildJob(cluster.kubeconfig_yaml, {
      jobName,
      namespace: params.namespace,
      repoHttpsUrl,
      githubToken: token || undefined,
      branch,
      destination: image,
      registryUrl,
      appName: safeName,
      buildArgs,
    });

    return { success: true, data: { jobName, image } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to start build" };
  }
}

export async function getBuildStatusAction(
  clusterId: string,
  namespace: string,
  jobName: string
): Promise<{ success: true; data: { phase: string; message?: string } } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };
    const status = await getBuildJobStatus(cluster.kubeconfig_yaml, namespace, jobName);
    return { success: true, data: status };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to get build status" };
  }
}

export async function getBuildLogsAction(
  clusterId: string,
  namespace: string,
  jobName: string
): Promise<{ success: true; data: string } | { success: false; error: string }> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };
    const logs = await getBuildLogs(cluster.kubeconfig_yaml, namespace, jobName);
    return { success: true, data: logs };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to get build logs" };
  }
}

export async function removeGithubDeployment(
  clusterId: string,
  deploymentId: string
): Promise<ActionResult<void>> {
  try {
    await requireSession();
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };

    const allDeployments = await getGithubDeployments(clusterId);
    const deployment = allDeployments.find((d) => d.id === deploymentId);
    if (!deployment) return { success: false, error: "Deployment not found" };

    // Try to clean up the resources
    try {
      const name = deployment.release_name;
      const ns = deployment.namespace;

      // Delete ingress, service, deployment, and secrets
      for (const kind of ["Ingress", "Service", "Deployment"]) {
        const apiVersion = kind === "Ingress" ? "networking.k8s.io/v1"
          : kind === "Deployment" ? "apps/v1" : "v1";
        try {
          await deleteResource(cluster.kubeconfig_yaml, apiVersion, kind, name, ns);
        } catch {
          // continue
        }
      }

      // Also try to delete associated secret
      try {
        await deleteResource(cluster.kubeconfig_yaml, "v1", "Secret", `${name}-secrets`, ns);
      } catch {
        // Secret might not exist, ignore
      }
    } catch {
      // Best effort
    }

    await insertDeploymentHistory(clusterId, "github", deploymentId, "delete", deployment.release_name, deployment.namespace, "deleted");
    await deleteGithubDeployment(deploymentId);

    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to remove deployment" };
  }
}

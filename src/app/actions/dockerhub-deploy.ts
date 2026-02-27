"use server";

import yaml from "js-yaml";
import {
  getClusterById,
  insertDockerhubDeployment,
  getDockerhubDeployments,
  updateDockerhubDeploymentStatus,
  deleteDockerhubDeployment,
  insertDeploymentHistory,
  type DockerhubDeploymentRow,
} from "@/lib/db";
import { generateDeploymentManifests } from "@/lib/manifest-generator";
import { applyResourceYaml, deleteResource } from "@/lib/kubernetes";
import type * as k8s from "@kubernetes/client-node";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export interface EnvVar {
  key: string;
  value: string;
  isSecret: boolean;
}

export interface DockerHubDeployConfig {
  name: string;
  namespace: string;
  image: string;
  tag: string;
  port: number;
  replicas: number;
  envVars?: EnvVar[];
  ingressEnabled?: boolean;
  ingressHost?: string;
}

export async function deployFromDockerhub(
  clusterId: string,
  deployConfig: DockerHubDeployConfig
): Promise<ActionResult<DockerhubDeploymentRow>> {
  try {
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };

    const fullImage = deployConfig.tag
      ? `${deployConfig.image}:${deployConfig.tag}`
      : deployConfig.image;

    const deployment = await insertDockerhubDeployment(
      clusterId,
      deployConfig.image,
      deployConfig.tag || "latest",
      deployConfig as unknown as Record<string, unknown>,
      deployConfig.name,
      deployConfig.namespace
    );

    await insertDeploymentHistory(
      clusterId,
      "dockerhub",
      deployment.id,
      "deploy",
      deployConfig.name,
      deployConfig.namespace,
      "deploying",
      { image: fullImage }
    );

    try {
      const manifestYaml = generateDeploymentManifests({
        name: deployConfig.name,
        namespace: deployConfig.namespace,
        image: fullImage,
        port: deployConfig.port,
        replicas: deployConfig.replicas,
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

      await updateDockerhubDeploymentStatus(deployment.id, "deployed");
      await insertDeploymentHistory(
        clusterId,
        "dockerhub",
        deployment.id,
        "deploy",
        deployConfig.name,
        deployConfig.namespace,
        "deployed"
      );
    } catch (deployErr) {
      await updateDockerhubDeploymentStatus(deployment.id, "failed");
      await insertDeploymentHistory(
        clusterId,
        "dockerhub",
        deployment.id,
        "deploy",
        deployConfig.name,
        deployConfig.namespace,
        "failed",
        { error: deployErr instanceof Error ? deployErr.message : "Deploy failed" }
      );
      return { success: false, error: deployErr instanceof Error ? deployErr.message : "Failed to deploy" };
    }

    const allDeployments = await getDockerhubDeployments(clusterId);
    const updated = allDeployments.find((d) => d.id === deployment.id) || deployment;
    return { success: true, data: updated };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to deploy from Docker Hub" };
  }
}

export async function fetchDockerhubDeployments(
  clusterId: string
): Promise<ActionResult<DockerhubDeploymentRow[]>> {
  try {
    const deployments = await getDockerhubDeployments(clusterId);
    return { success: true, data: deployments };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to fetch deployments" };
  }
}

export interface DockerHubSearchResult {
  repo_name: string;
  repo_owner?: string;
  short_description?: string;
  star_count?: number;
  pull_count?: number;
  is_official: boolean;
}

export async function searchDockerhub(
  query: string
): Promise<ActionResult<DockerHubSearchResult[]>> {
  try {
    const response = await fetch(
      `https://hub.docker.com/v2/search/repositories/?query=${encodeURIComponent(query)}&page_size=10`
    );

    if (!response.ok) {
      return { success: false, error: "Failed to search Docker Hub" };
    }

    const data = await response.json();
    return { success: true, data: data.results || [] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to search Docker Hub" };
  }
}

export async function removeDockerhubDeployment(
  clusterId: string,
  deploymentId: string
): Promise<ActionResult<void>> {
  try {
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };

    const allDeployments = await getDockerhubDeployments(clusterId);
    const deployment = allDeployments.find((d) => d.id === deploymentId);
    if (!deployment) return { success: false, error: "Deployment not found" };

    // Try to clean up the resources
    try {
      const name = deployment.release_name;
      const ns = deployment.namespace;

      // Delete ingress, service, deployment, and secrets
      for (const kind of ["Ingress", "Service", "Deployment"]) {
        const apiVersion =
          kind === "Ingress"
            ? "networking.k8s.io/v1"
            : kind === "Deployment"
              ? "apps/v1"
              : "v1";
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

    await insertDeploymentHistory(
      clusterId,
      "dockerhub",
      deploymentId,
      "delete",
      deployment.release_name,
      deployment.namespace,
      "deleted"
    );
    await deleteDockerhubDeployment(deploymentId);

    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to remove deployment" };
  }
}

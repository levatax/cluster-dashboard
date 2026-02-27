"use server";

import yaml from "js-yaml";
import { getClusterById, insertAppInstall, getAppInstalls, updateAppInstallStatus, deleteAppInstall, insertDeploymentHistory, type AppInstallRow } from "@/lib/db";
import { getAllCatalogApps, getCatalogApp } from "@/lib/catalog/index";
import { applyResourceYaml, deleteResource } from "@/lib/kubernetes";
import { isHelmAvailable, helmInstall, helmUninstall } from "@/lib/helm";
import type { CatalogApp } from "@/lib/catalog/types";
import type * as k8s from "@kubernetes/client-node";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export async function fetchCatalogApps(): Promise<ActionResult<Omit<CatalogApp, "generateManifests">[]>> {
  try {
    const apps = getAllCatalogApps();
    // Strip generateManifests function for serialization
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const serializable = apps.map(({ generateManifests: _gen, ...rest }) => rest);
    return { success: true, data: serializable };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to fetch catalog" };
  }
}

export async function checkHelmAvailable(): Promise<ActionResult<boolean>> {
  try {
    const available = await isHelmAvailable();
    return { success: true, data: available };
  } catch {
    return { success: true, data: false };
  }
}

export async function fetchInstalledApps(clusterId: string): Promise<ActionResult<AppInstallRow[]>> {
  try {
    const installs = await getAppInstalls(clusterId);
    return { success: true, data: installs };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to fetch installed apps" };
  }
}

export async function installCatalogApp(
  clusterId: string,
  appId: string,
  config: Record<string, unknown>,
  deployMethod: "manifest" | "helm" = "manifest"
): Promise<ActionResult<AppInstallRow>> {
  try {
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };

    const app = await getCatalogApp(appId);
    if (!app) return { success: false, error: `App "${appId}" not found in catalog` };

    const releaseName = (config.releaseName as string) || appId;
    const namespace = (config.namespace as string) || "default";

    // Record the install
    const install = await insertAppInstall(clusterId, appId, releaseName, namespace, config, deployMethod);

    // Log history
    await insertDeploymentHistory(clusterId, "catalog", install.id, "install", releaseName, namespace, "deploying", {
      appId,
      deployMethod,
    });

    if (deployMethod === "manifest") {
      try {
        const manifestsYaml = app.generateManifests(config);
        const docs = yaml.loadAll(manifestsYaml) as k8s.KubernetesObject[];

        for (const doc of docs) {
          if (doc && typeof doc === "object") {
            await applyResourceYaml(cluster.kubeconfig_yaml, doc);
          }
        }

        await updateAppInstallStatus(install.id, "deployed");
        await insertDeploymentHistory(clusterId, "catalog", install.id, "install", releaseName, namespace, "deployed");
      } catch (deployErr) {
        await updateAppInstallStatus(install.id, "failed");
        await insertDeploymentHistory(clusterId, "catalog", install.id, "install", releaseName, namespace, "failed", {
          error: deployErr instanceof Error ? deployErr.message : "Deploy failed",
        });
        return { success: false, error: deployErr instanceof Error ? deployErr.message : "Failed to deploy manifests" };
      }
    } else if (deployMethod === "helm") {
      if (!app.helmChart) {
        await updateAppInstallStatus(install.id, "failed");
        return { success: false, error: "This app does not have a Helm chart" };
      }

      const helmOk = await isHelmAvailable();
      if (!helmOk) {
        await updateAppInstallStatus(install.id, "failed");
        return { success: false, error: "Helm CLI is not installed on the server" };
      }

      try {
        await helmInstall({
          kubeconfigYaml: cluster.kubeconfig_yaml,
          releaseName,
          chart: app.helmChart.chart,
          namespace,
          repoName: app.helmChart.repo,
          repoUrl: app.helmChart.repoUrl,
          version: (config.version as string) || undefined,
          values: app.helmChart.defaultValues,
          createNamespace: true,
        });

        await updateAppInstallStatus(install.id, "deployed");
        await insertDeploymentHistory(clusterId, "catalog", install.id, "install", releaseName, namespace, "deployed");
      } catch (helmErr) {
        await updateAppInstallStatus(install.id, "failed");
        await insertDeploymentHistory(clusterId, "catalog", install.id, "install", releaseName, namespace, "failed", {
          error: helmErr instanceof Error ? helmErr.message : "Helm install failed",
        });
        return { success: false, error: helmErr instanceof Error ? helmErr.message : "Helm install failed" };
      }
    }

    const allInstalls = await getAppInstalls(clusterId);
    const updated = allInstalls.find((i) => i.id === install.id) || install;
    return { success: true, data: updated };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to install app" };
  }
}

export async function uninstallCatalogApp(
  clusterId: string,
  installId: string
): Promise<ActionResult<void>> {
  try {
    const cluster = await getClusterById(clusterId);
    if (!cluster) return { success: false, error: "Cluster not found" };

    const allInstalls = await getAppInstalls(clusterId);
    const install = allInstalls.find((i) => i.id === installId);
    if (!install) return { success: false, error: "Install not found" };

    await updateAppInstallStatus(installId, "uninstalling");

    const app = await getCatalogApp(install.catalog_app_id);

    if (install.deploy_method === "helm") {
      try {
        await helmUninstall(cluster.kubeconfig_yaml, install.release_name, install.namespace);
      } catch {
        // Best effort
      }
    } else if (install.deploy_method === "manifest" && app) {
      try {
        const manifestsYaml = app.generateManifests(install.config_values);
        const docs = yaml.loadAll(manifestsYaml) as Array<{
          apiVersion?: string;
          kind?: string;
          metadata?: { name?: string; namespace?: string };
        }>;

        // Delete in reverse order
        for (const doc of docs.reverse()) {
          if (doc?.apiVersion && doc?.kind && doc?.metadata?.name) {
            try {
              await deleteResource(
                cluster.kubeconfig_yaml,
                doc.apiVersion,
                doc.kind,
                doc.metadata.name,
                doc.metadata.namespace
              );
            } catch {
              // Continue deleting other resources
            }
          }
        }
      } catch {
        // Best effort cleanup
      }
    }

    await insertDeploymentHistory(clusterId, "catalog", installId, "uninstall", install.release_name, install.namespace, "uninstalled");
    await deleteAppInstall(installId);

    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to uninstall app" };
  }
}

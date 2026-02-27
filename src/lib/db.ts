import mongoose from "mongoose";
import { connectDB } from "./mongodb";
import { ClusterModel } from "./models/cluster";
import { AlertConfigModel } from "./models/alert-config";
import { AppInstallModel } from "./models/app-install";
import { GithubDeploymentModel } from "./models/github-deployment";
import { DeploymentHistoryModel } from "./models/deployment-history";
import { DeploymentTemplateModel } from "./models/deployment-template";
import { DockerhubDeploymentModel } from "./models/dockerhub-deployment";
import { encrypt, decrypt, encryptionAvailable } from "./encryption";

// --- Encryption helpers ---

function encryptField(value: string): string {
  if (!encryptionAvailable()) return value;
  return encrypt(value);
}

function decryptField(value: string): string {
  if (!encryptionAvailable()) return value;
  try {
    return decrypt(value);
  } catch {
    // Value may be stored unencrypted (pre-migration)
    return value;
  }
}

// --- Helpers ---

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDateString(d: any): string {
  if (!d) return "";
  if (d instanceof Date) return d.toISOString();
  return String(d);
}

// --- Cluster ---

export interface ClusterMeta {
  id: string;
  name: string;
  server: string;
  created_at: string;
  last_connected_at: string | null;
  registry_url: string | null;
}

export interface Cluster extends ClusterMeta {
  kubeconfig_yaml: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toClusterMeta(doc: any): ClusterMeta {
  return {
    id: doc._id.toString(),
    name: doc.name,
    server: doc.server,
    created_at: toDateString(doc.created_at),
    last_connected_at: doc.last_connected_at ? toDateString(doc.last_connected_at) : null,
    registry_url: doc.registry_url ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCluster(doc: any): Cluster {
  return {
    ...toClusterMeta(doc),
    kubeconfig_yaml: decryptField(doc.kubeconfig_yaml),
  };
}

export async function getAllClusters(): Promise<ClusterMeta[]> {
  await connectDB();
  const docs = await ClusterModel.find().select("-kubeconfig_yaml").sort({ created_at: -1 }).lean();
  return docs.map(toClusterMeta);
}

export async function getClusterById(id: string): Promise<Cluster | null> {
  await connectDB();
  if (!isValidObjectId(id)) return null;
  const doc = await ClusterModel.findById(id).lean();
  return doc ? toCluster(doc) : null;
}

export async function insertCluster(name: string, server: string, yaml: string): Promise<Cluster> {
  await connectDB();
  const doc = await ClusterModel.create({ name, server, kubeconfig_yaml: encryptField(yaml) });
  return toCluster(doc);
}

export async function deleteCluster(id: string): Promise<void> {
  if (!isValidObjectId(id)) return;
  await connectDB();
  await ClusterModel.findOneAndDelete({ _id: id });
}

export async function updateLastConnected(id: string): Promise<void> {
  if (!isValidObjectId(id)) return;
  await connectDB();
  await ClusterModel.findByIdAndUpdate(id, { last_connected_at: new Date() });
}

// --- Alert Config ---

export interface AlertConfig {
  id: string;
  cluster_id: string;
  metric: string;
  warning_threshold: number;
  critical_threshold: number;
  enabled: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAlertConfig(doc: any): AlertConfig {
  return {
    id: doc._id.toString(),
    cluster_id: doc.cluster_id.toString(),
    metric: doc.metric,
    warning_threshold: doc.warning_threshold,
    critical_threshold: doc.critical_threshold,
    enabled: doc.enabled,
  };
}

export async function getAlertConfigs(clusterId: string): Promise<AlertConfig[]> {
  await connectDB();
  const docs = await AlertConfigModel.find({ cluster_id: clusterId }).lean();
  return docs.map(toAlertConfig);
}

export async function upsertAlertConfig(
  clusterId: string,
  metric: string,
  warningThreshold: number,
  criticalThreshold: number,
  enabled: boolean
): Promise<void> {
  await connectDB();
  await AlertConfigModel.findOneAndUpdate(
    { cluster_id: clusterId, metric },
    {
      cluster_id: clusterId,
      metric,
      warning_threshold: warningThreshold,
      critical_threshold: criticalThreshold,
      enabled,
    },
    { upsert: true }
  );
}

// --- App Catalog Installs ---

export interface AppInstallRow {
  id: string;
  cluster_id: string;
  catalog_app_id: string;
  release_name: string;
  namespace: string;
  config_values: Record<string, unknown>;
  deploy_method: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAppInstall(doc: any): AppInstallRow {
  return {
    id: doc._id.toString(),
    cluster_id: doc.cluster_id.toString(),
    catalog_app_id: doc.catalog_app_id,
    release_name: doc.release_name,
    namespace: doc.namespace,
    config_values: doc.config_values ?? {},
    deploy_method: doc.deploy_method,
    status: doc.status,
    created_at: toDateString(doc.created_at),
    updated_at: toDateString(doc.updated_at),
  };
}

export async function insertAppInstall(
  clusterId: string,
  catalogAppId: string,
  releaseName: string,
  namespace: string,
  configValues: Record<string, unknown>,
  deployMethod: string
): Promise<AppInstallRow> {
  await connectDB();
  const doc = await AppInstallModel.create({
    cluster_id: clusterId,
    catalog_app_id: catalogAppId,
    release_name: releaseName,
    namespace,
    config_values: configValues,
    deploy_method: deployMethod,
  });
  return toAppInstall(doc);
}

export async function getAppInstalls(clusterId: string): Promise<AppInstallRow[]> {
  await connectDB();
  const docs = await AppInstallModel.find({ cluster_id: clusterId }).sort({ created_at: -1 }).lean();
  return docs.map(toAppInstall);
}

export async function updateAppInstallStatus(id: string, status: string): Promise<void> {
  if (!isValidObjectId(id)) return;
  await connectDB();
  await AppInstallModel.findByIdAndUpdate(id, { status, updated_at: new Date() });
}

export async function deleteAppInstall(id: string): Promise<void> {
  if (!isValidObjectId(id)) return;
  await connectDB();
  await AppInstallModel.findByIdAndDelete(id);
}

// --- GitHub Deployments ---

export interface GithubDeploymentRow {
  id: string;
  cluster_id: string;
  repo_url: string;
  branch: string;
  github_token: string | null;
  deploy_config: Record<string, unknown>;
  deploy_method: string;
  release_name: string;
  namespace: string;
  status: string;
  last_commit_sha: string | null;
  created_at: string;
  updated_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toGithubDeployment(doc: any): GithubDeploymentRow {
  return {
    id: doc._id.toString(),
    cluster_id: doc.cluster_id.toString(),
    repo_url: doc.repo_url,
    branch: doc.branch,
    github_token: doc.github_token ? decryptField(doc.github_token) : null,
    deploy_config: doc.deploy_config ?? {},
    deploy_method: doc.deploy_method,
    release_name: doc.release_name,
    namespace: doc.namespace,
    status: doc.status,
    last_commit_sha: doc.last_commit_sha ?? null,
    created_at: toDateString(doc.created_at),
    updated_at: toDateString(doc.updated_at),
  };
}

export async function insertGithubDeployment(
  clusterId: string,
  repoUrl: string,
  branch: string,
  githubToken: string | null,
  deployConfig: Record<string, unknown>,
  deployMethod: string,
  releaseName: string,
  namespace: string
): Promise<GithubDeploymentRow> {
  await connectDB();
  const doc = await GithubDeploymentModel.create({
    cluster_id: clusterId,
    repo_url: repoUrl,
    branch,
    github_token: githubToken ? encryptField(githubToken) : null,
    deploy_config: deployConfig,
    deploy_method: deployMethod,
    release_name: releaseName,
    namespace,
  });
  return toGithubDeployment(doc);
}

export async function getGithubDeployments(clusterId: string): Promise<GithubDeploymentRow[]> {
  await connectDB();
  const docs = await GithubDeploymentModel.find({ cluster_id: clusterId }).sort({ created_at: -1 }).lean();
  return docs.map(toGithubDeployment);
}

export async function updateGithubDeploymentStatus(id: string, status: string, commitSha?: string): Promise<void> {
  if (!isValidObjectId(id)) return;
  await connectDB();
  const update: Record<string, unknown> = { status, updated_at: new Date() };
  if (commitSha) update.last_commit_sha = commitSha;
  await GithubDeploymentModel.findByIdAndUpdate(id, update);
}

export async function deleteGithubDeployment(id: string): Promise<void> {
  if (!isValidObjectId(id)) return;
  await connectDB();
  await GithubDeploymentModel.findByIdAndDelete(id);
}

// --- Deployment History ---

export interface DeploymentHistoryRow {
  id: string;
  cluster_id: string;
  source_type: string;
  source_id: string | null;
  action: string;
  release_name: string;
  namespace: string;
  status: string;
  details: Record<string, unknown>;
  created_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDeploymentHistory(doc: any): DeploymentHistoryRow {
  return {
    id: doc._id.toString(),
    cluster_id: doc.cluster_id.toString(),
    source_type: doc.source_type,
    source_id: doc.source_id ?? null,
    action: doc.action,
    release_name: doc.release_name,
    namespace: doc.namespace,
    status: doc.status,
    details: doc.details ?? {},
    created_at: toDateString(doc.created_at),
  };
}

export async function insertDeploymentHistory(
  clusterId: string,
  sourceType: string,
  sourceId: string | null,
  action: string,
  releaseName: string,
  namespace: string,
  status: string,
  details: Record<string, unknown> = {}
): Promise<DeploymentHistoryRow> {
  await connectDB();
  const doc = await DeploymentHistoryModel.create({
    cluster_id: clusterId,
    source_type: sourceType,
    source_id: sourceId,
    action,
    release_name: releaseName,
    namespace,
    status,
    details,
  });
  return toDeploymentHistory(doc);
}

export async function getDeploymentHistory(clusterId: string, limit = 100): Promise<DeploymentHistoryRow[]> {
  await connectDB();
  const docs = await DeploymentHistoryModel.find({ cluster_id: clusterId }).sort({ created_at: -1 }).limit(limit).lean();
  return docs.map(toDeploymentHistory);
}

// --- Cluster Registry URL ---

export async function getClusterRegistryUrl(clusterId: string): Promise<string | null> {
  await connectDB();
  const doc = await ClusterModel.findById(clusterId).select("registry_url").lean();
  return doc?.registry_url ?? null;
}

export async function setClusterRegistryUrl(clusterId: string, url: string | null): Promise<void> {
  await connectDB();
  await ClusterModel.findByIdAndUpdate(clusterId, { registry_url: url });
}

// --- Deployment Templates ---

export interface DeploymentTemplateRow {
  id: string;
  name: string;
  description: string | null;
  source_type: string;
  config: Record<string, unknown>;
  catalog_app_id: string | null;
  created_at: string;
  updated_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDeploymentTemplate(doc: any): DeploymentTemplateRow {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description ?? null,
    source_type: doc.source_type,
    config: doc.config ?? {},
    catalog_app_id: doc.catalog_app_id ?? null,
    created_at: toDateString(doc.created_at),
    updated_at: toDateString(doc.updated_at),
  };
}

export async function insertDeploymentTemplate(
  name: string,
  description: string | null,
  sourceType: string,
  config: Record<string, unknown>,
  catalogAppId?: string
): Promise<DeploymentTemplateRow> {
  await connectDB();
  const doc = await DeploymentTemplateModel.create({
    name,
    description,
    source_type: sourceType,
    config,
    catalog_app_id: catalogAppId || null,
  });
  return toDeploymentTemplate(doc);
}

export async function getDeploymentTemplatesByType(sourceType: string): Promise<DeploymentTemplateRow[]> {
  await connectDB();
  const docs = await DeploymentTemplateModel.find({ source_type: sourceType }).sort({ updated_at: -1 }).lean();
  return docs.map(toDeploymentTemplate);
}

export async function deleteDeploymentTemplate(id: string): Promise<void> {
  if (!isValidObjectId(id)) return;
  await connectDB();
  await DeploymentTemplateModel.findByIdAndDelete(id);
}

// --- Docker Hub Deployments ---

export interface DockerhubDeploymentRow {
  id: string;
  cluster_id: string;
  image: string;
  tag: string;
  deploy_config: Record<string, unknown>;
  release_name: string;
  namespace: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDockerhubDeployment(doc: any): DockerhubDeploymentRow {
  return {
    id: doc._id.toString(),
    cluster_id: doc.cluster_id.toString(),
    image: doc.image,
    tag: doc.tag,
    deploy_config: doc.deploy_config ?? {},
    release_name: doc.release_name,
    namespace: doc.namespace,
    status: doc.status,
    created_at: toDateString(doc.created_at),
    updated_at: toDateString(doc.updated_at),
  };
}

export async function insertDockerhubDeployment(
  clusterId: string,
  image: string,
  tag: string,
  deployConfig: Record<string, unknown>,
  releaseName: string,
  namespace: string
): Promise<DockerhubDeploymentRow> {
  await connectDB();
  const doc = await DockerhubDeploymentModel.create({
    cluster_id: clusterId,
    image,
    tag,
    deploy_config: deployConfig,
    release_name: releaseName,
    namespace,
  });
  return toDockerhubDeployment(doc);
}

export async function getDockerhubDeployments(clusterId: string): Promise<DockerhubDeploymentRow[]> {
  await connectDB();
  const docs = await DockerhubDeploymentModel.find({ cluster_id: clusterId }).sort({ created_at: -1 }).lean();
  return docs.map(toDockerhubDeployment);
}

export async function updateDockerhubDeploymentStatus(id: string, status: string): Promise<void> {
  if (!isValidObjectId(id)) return;
  await connectDB();
  await DockerhubDeploymentModel.findByIdAndUpdate(id, { status, updated_at: new Date() });
}

export async function deleteDockerhubDeployment(id: string): Promise<void> {
  if (!isValidObjectId(id)) return;
  await connectDB();
  await DockerhubDeploymentModel.findByIdAndDelete(id);
}

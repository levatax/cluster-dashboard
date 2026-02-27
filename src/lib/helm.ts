import { execFile } from "node:child_process";
import { writeFile, unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

function exec(cmd: string, args: string[], timeout = 60_000): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve({ stdout, stderr });
    });
  });
}

let _helmAvailable: boolean | null = null;

export async function isHelmAvailable(): Promise<boolean> {
  if (_helmAvailable !== null) return _helmAvailable;
  try {
    await exec("helm", ["version", "--short"]);
    _helmAvailable = true;
  } catch {
    _helmAvailable = false;
  }
  return _helmAvailable;
}

async function withTempKubeconfig<T>(kubeconfigYaml: string, fn: (path: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), "kube-"));
  const filePath = path.join(dir, "kubeconfig");
  await writeFile(filePath, kubeconfigYaml, { mode: 0o600 });
  try {
    return await fn(filePath);
  } finally {
    await unlink(filePath).catch(() => {});
  }
}

export async function helmRepoAdd(name: string, url: string): Promise<void> {
  try {
    await exec("helm", ["repo", "add", name, url, "--force-update"]);
  } catch (e) {
    throw new Error(`Failed to add Helm repo ${name}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function helmRepoUpdate(): Promise<void> {
  await exec("helm", ["repo", "update"]);
}

export interface HelmInstallOptions {
  kubeconfigYaml: string;
  releaseName: string;
  chart: string;
  namespace: string;
  repoName?: string;
  repoUrl?: string;
  values?: Record<string, unknown>;
  version?: string;
  createNamespace?: boolean;
}

export async function helmInstall(opts: HelmInstallOptions): Promise<string> {
  if (opts.repoName && opts.repoUrl) {
    await helmRepoAdd(opts.repoName, opts.repoUrl);
    await helmRepoUpdate();
  }

  return withTempKubeconfig(opts.kubeconfigYaml, async (kcPath) => {
    const args = [
      "install",
      opts.releaseName,
      opts.repoName ? `${opts.repoName}/${opts.chart}` : opts.chart,
      "--namespace", opts.namespace,
      "--kubeconfig", kcPath,
    ];

    if (opts.createNamespace !== false) {
      args.push("--create-namespace");
    }

    if (opts.version) {
      args.push("--version", opts.version);
    }

    if (opts.values && Object.keys(opts.values).length > 0) {
      for (const [key, val] of Object.entries(opts.values)) {
        args.push("--set", `${key}=${String(val)}`);
      }
    }

    const { stdout } = await exec("helm", args, 120_000);
    return stdout;
  });
}

export async function helmUninstall(
  kubeconfigYaml: string,
  releaseName: string,
  namespace: string
): Promise<string> {
  return withTempKubeconfig(kubeconfigYaml, async (kcPath) => {
    const { stdout } = await exec("helm", [
      "uninstall", releaseName,
      "--namespace", namespace,
      "--kubeconfig", kcPath,
    ]);
    return stdout;
  });
}

export interface HelmRelease {
  name: string;
  namespace: string;
  revision: string;
  status: string;
  chart: string;
  app_version: string;
  updated: string;
}

export async function helmList(kubeconfigYaml: string, namespace?: string): Promise<HelmRelease[]> {
  return withTempKubeconfig(kubeconfigYaml, async (kcPath) => {
    const args = ["list", "--output", "json", "--kubeconfig", kcPath];
    if (namespace) {
      args.push("--namespace", namespace);
    } else {
      args.push("--all-namespaces");
    }

    const { stdout } = await exec("helm", args);
    try {
      return JSON.parse(stdout) as HelmRelease[];
    } catch {
      return [];
    }
  });
}

export async function helmStatus(
  kubeconfigYaml: string,
  releaseName: string,
  namespace: string
): Promise<string> {
  return withTempKubeconfig(kubeconfigYaml, async (kcPath) => {
    const { stdout } = await exec("helm", [
      "status", releaseName,
      "--namespace", namespace,
      "--kubeconfig", kcPath,
    ]);
    return stdout;
  });
}

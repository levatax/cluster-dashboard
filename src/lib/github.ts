export interface RepoInfo {
  name: string;
  fullName: string;
  description: string;
  defaultBranch: string;
  language: string | null;
  private: boolean;
}

export interface RepoFile {
  name: string;
  path: string;
  type: "file" | "dir";
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  // Handle: https://github.com/owner/repo, git@github.com:owner/repo.git, owner/repo
  const patterns = [
    /github\.com[/:]([^/]+)\/([^/.]+)/,
    /^([^/]+)\/([^/]+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
    }
  }
  return null;
}

function apiHeaders(token?: string | null): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "cluster-dashboard",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function getRepoInfo(
  owner: string,
  repo: string,
  token?: string | null
): Promise<RepoInfo> {
  const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: apiHeaders(token),
  });

  if (!resp.ok) {
    if (resp.status === 404) throw new Error("Repository not found. Check the URL or provide a token for private repos.");
    throw new Error(`GitHub API error: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  return {
    name: data.name,
    fullName: data.full_name,
    description: data.description || "",
    defaultBranch: data.default_branch,
    language: data.language,
    private: data.private,
  };
}

export async function getRepoContents(
  owner: string,
  repo: string,
  path: string,
  branch?: string,
  token?: string | null
): Promise<RepoFile[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}${branch ? `?ref=${branch}` : ""}`;
  const resp = await fetch(url, { headers: apiHeaders(token) });

  if (!resp.ok) {
    if (resp.status === 404) return [];
    throw new Error(`GitHub API error: ${resp.status}`);
  }

  const data = await resp.json();
  if (!Array.isArray(data)) return [];

  return data.map((item: { name: string; path: string; type: string }) => ({
    name: item.name,
    path: item.path,
    type: item.type as "file" | "dir",
  }));
}

export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  branch?: string,
  token?: string | null
): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}${branch ? `?ref=${branch}` : ""}`;
  const resp = await fetch(url, { headers: apiHeaders(token) });

  if (!resp.ok) {
    throw new Error(`Failed to fetch file: ${resp.status}`);
  }

  const data = await resp.json();
  if (data.encoding === "base64" && data.content) {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }
  throw new Error("Unexpected file encoding");
}

export async function getLatestCommitSha(
  owner: string,
  repo: string,
  branch: string,
  token?: string | null
): Promise<string> {
  const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${branch}`, {
    headers: apiHeaders(token),
  });
  if (!resp.ok) {
    throw new Error(`GitHub API error: ${resp.status} ${resp.statusText}`);
  }
  const data = await resp.json();
  return (data.sha as string).slice(0, 12);
}

export type DetectedDeployType =
  | { type: "cluster-deploy"; config: Record<string, unknown> }
  | { type: "kubernetes-manifests"; paths: string[] }
  | { type: "dockerfile"; port?: number }
  | { type: "unknown" };

export async function detectDeployType(
  owner: string,
  repo: string,
  branch?: string,
  token?: string | null
): Promise<DetectedDeployType> {
  // 1. Check for .cluster-deploy.yaml
  try {
    const content = await getFileContent(owner, repo, ".cluster-deploy.yaml", branch, token);
    const yaml = await import("js-yaml");
    const config = yaml.load(content) as Record<string, unknown>;
    return { type: "cluster-deploy", config };
  } catch {
    // Not found
  }

  // 2. Check for k8s/deploy/kubernetes directories
  const k8sDirs = ["k8s", "deploy", "kubernetes", "manifests", ".k8s"];
  for (const dir of k8sDirs) {
    const files = await getRepoContents(owner, repo, dir, branch, token);
    const yamlFiles = files.filter(
      (f) => f.type === "file" && (f.name.endsWith(".yaml") || f.name.endsWith(".yml"))
    );
    if (yamlFiles.length > 0) {
      return { type: "kubernetes-manifests", paths: yamlFiles.map((f) => f.path) };
    }
  }

  // 3. Check for Dockerfile
  const rootFiles = await getRepoContents(owner, repo, "", branch, token);
  const dockerfile = rootFiles.find(
    (f) => f.name === "Dockerfile" || f.name === "dockerfile"
  );
  if (dockerfile) {
    try {
      const content = await getFileContent(owner, repo, dockerfile.path, branch, token);
      const exposeMatch = content.match(/EXPOSE\s+(\d+)/);
      const port = exposeMatch ? parseInt(exposeMatch[1], 10) : undefined;
      return { type: "dockerfile", port };
    } catch {
      return { type: "dockerfile" };
    }
  }

  return { type: "unknown" };
}

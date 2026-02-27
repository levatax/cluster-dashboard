"use client";

import { Badge } from "@/components/ui/badge";
import { FileCode, GitBranch, Box, Lock } from "lucide-react";
import type { RepoAnalysis } from "@/app/actions/github-deploy";

interface DeployPreviewProps {
  analysis: RepoAnalysis;
}

export function DeployPreview({ analysis }: DeployPreviewProps) {
  const { repoInfo, deployType } = analysis;

  return (
    <div className="space-y-2">
      {/* Repo info row */}
      <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
        <GitBranch className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <span className="font-mono text-sm font-medium">{repoInfo.fullName}</span>
          {repoInfo.description && (
            <span className="ml-2 hidden text-[11px] text-muted-foreground sm:inline">
              {repoInfo.description}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {repoInfo.language && (
            <Badge variant="secondary" className="text-xs">{repoInfo.language}</Badge>
          )}
          <Badge variant="outline" className="text-xs">{repoInfo.defaultBranch}</Badge>
          {repoInfo.private && (
            <Badge
              variant="outline"
              className="text-xs border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
            >
              <Lock className="mr-1 size-3" />
              Private
            </Badge>
          )}
        </div>
      </div>

      {/* Deploy type row */}
      <div className="flex items-start gap-2.5 rounded-lg border px-3 py-2.5">
        {deployType.type === "cluster-deploy" && (
          <FileCode className="mt-0.5 size-4 shrink-0 text-emerald-500" />
        )}
        {deployType.type === "kubernetes-manifests" && (
          <FileCode className="mt-0.5 size-4 shrink-0 text-blue-500" />
        )}
        {deployType.type === "dockerfile" && (
          <Box className="mt-0.5 size-4 shrink-0 text-purple-500" />
        )}
        {deployType.type === "unknown" && (
          <Box className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0">
          <span className="text-sm font-medium">
            {deployType.type === "cluster-deploy" && "cluster-deploy.yaml detected"}
            {deployType.type === "kubernetes-manifests" &&
              `${deployType.paths.length} Kubernetes manifest${deployType.paths.length > 1 ? "s" : ""} detected`}
            {deployType.type === "dockerfile" &&
              `Dockerfile detected${deployType.port ? ` · port ${deployType.port}` : ""}`}
            {deployType.type === "unknown" && "No deploy config — configure manually"}
          </span>
          {deployType.type === "kubernetes-manifests" && (
            <ul className="mt-1 space-y-0.5">
              {deployType.paths.map((p) => (
                <li key={p} className="font-mono text-[11px] text-muted-foreground">{p}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

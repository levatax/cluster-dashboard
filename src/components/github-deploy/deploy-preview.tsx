"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCode, GitBranch, Box } from "lucide-react";
import type { RepoAnalysis } from "@/app/actions/github-deploy";

interface DeployPreviewProps {
  analysis: RepoAnalysis;
}

export function DeployPreview({ analysis }: DeployPreviewProps) {
  const { repoInfo, deployType } = analysis;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="size-4" />
          {repoInfo.fullName}
        </CardTitle>
        {repoInfo.description && (
          <p className="text-sm text-muted-foreground">{repoInfo.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {repoInfo.language && (
            <Badge variant="secondary" className="text-xs">
              {repoInfo.language}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {repoInfo.defaultBranch}
          </Badge>
          {repoInfo.private && (
            <Badge variant="outline" className="text-xs border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
              Private
            </Badge>
          )}
        </div>

        <div className="rounded-md border border-border bg-muted/50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            {deployType.type === "cluster-deploy" && (
              <>
                <FileCode className="size-4 text-emerald-500" />
                <span>Found .cluster-deploy.yaml</span>
              </>
            )}
            {deployType.type === "kubernetes-manifests" && (
              <>
                <FileCode className="size-4 text-blue-500" />
                <span>Found {deployType.paths.length} Kubernetes manifest{deployType.paths.length > 1 ? "s" : ""}</span>
              </>
            )}
            {deployType.type === "dockerfile" && (
              <>
                <Box className="size-4 text-purple-500" />
                <span>Found Dockerfile{deployType.port ? ` (port ${deployType.port})` : ""}</span>
              </>
            )}
            {deployType.type === "unknown" && (
              <>
                <Box className="size-4 text-muted-foreground" />
                <span>No deploy config detected — configure manually</span>
              </>
            )}
          </div>

          {deployType.type === "kubernetes-manifests" && (
            <ul className="mt-2 space-y-0.5">
              {deployType.paths.map((p) => (
                <li key={p} className="text-xs text-muted-foreground font-mono">{p}</li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

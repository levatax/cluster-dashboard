"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppStatusBadge } from "@/components/app-store/app-status-badge";
import { GitBranch, Trash2, Loader2 } from "lucide-react";
import type { GithubDeploymentRow } from "@/lib/db";

interface GithubDeploymentsListProps {
  deployments: GithubDeploymentRow[];
  onRemove: (id: string) => Promise<void>;
}

export function GithubDeploymentsList({ deployments, onRemove }: GithubDeploymentsListProps) {
  const [removing, setRemoving] = useState<string | null>(null);

  if (deployments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No GitHub deployments yet.
      </div>
    );
  }

  async function handleRemove(id: string) {
    setRemoving(id);
    try {
      await onRemove(id);
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="grid gap-3">
      {deployments.map((dep) => {
        const repoName = dep.repo_url.replace(/^https?:\/\/github\.com\//, "");
        return (
          <Card key={dep.id}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <GitBranch className="size-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{dep.release_name}</span>
                  <AppStatusBadge status={dep.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {repoName} ({dep.branch}) &middot; {dep.namespace}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(dep.id)}
                disabled={removing === dep.id}
              >
                {removing === dep.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Box, Trash2, ExternalLink } from "lucide-react";
import type { DockerhubDeploymentRow } from "@/lib/db";

interface DockerhubDeploymentsListProps {
  deployments: DockerhubDeploymentRow[];
  onRemove: (id: string) => void;
}

export function DockerhubDeploymentsList({ deployments, onRemove }: DockerhubDeploymentsListProps) {
  return (
    <div className="space-y-2">
      {deployments.map((d) => {
        const fullImage = `${d.image}:${d.tag}`;
        const hubUrl = d.image.includes("/")
          ? `https://hub.docker.com/r/${d.image}`
          : `https://hub.docker.com/_/${d.image}`;

        return (
          <div
            key={d.id}
            className="flex items-center gap-3 rounded-lg border border-border p-3 bg-card"
          >
            <Box className="size-5 text-blue-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{d.release_name}</span>
                <Badge
                  variant="outline"
                  className={
                    d.status === "deployed"
                      ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                      : d.status === "failed"
                        ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
                        : "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                  }
                >
                  {d.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground truncate font-mono">
                  {fullImage}
                </span>
                <a
                  href={hubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="size-3" />
                </a>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {d.namespace} &middot; {new Date(d.created_at).toLocaleString()}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(d.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

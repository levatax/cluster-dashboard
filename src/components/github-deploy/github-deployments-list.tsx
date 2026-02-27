"use client";

import { useState } from "react";
import {
  GitBranch,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  FolderOpen,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GithubDeploymentRow } from "@/lib/db";

// ─── Status config ────────────────────────────────────────────────────────────

type StatusCfg = {
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  badgeClass: string;
  spin?: boolean;
};

const STATUS: Record<string, StatusCfg> = {
  deployed: {
    icon: CheckCircle2,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    badgeClass:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  failed: {
    icon: XCircle,
    iconColor: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-500/10",
    badgeClass:
      "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
  },
  deploying: {
    icon: Loader2,
    iconColor: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    badgeClass:
      "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    spin: true,
  },
};

const DEFAULT_STATUS: StatusCfg = {
  icon: Loader2,
  iconColor: "text-muted-foreground",
  bgColor: "bg-muted",
  badgeClass: "border-muted-foreground/30 bg-muted text-muted-foreground",
  spin: true,
};

function getStatus(s: string): StatusCfg {
  return STATUS[s] ?? DEFAULT_STATUS;
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function DeploymentRow({
  d,
  onRemove,
}: {
  d: GithubDeploymentRow;
  onRemove: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const cfg = getStatus(d.status);
  const StatusIcon = cfg.icon;
  const repoName = d.repo_url.replace(/^https?:\/\/github\.com\//, "");

  const deployedAt = new Date(d.created_at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function handleRemoveClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirming) {
      onRemove(d.id);
      setConfirming(false);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    }
  }

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40">
      {/* Status icon */}
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-md",
          cfg.bgColor
        )}
      >
        <StatusIcon
          className={cn("size-3.5", cfg.iconColor, cfg.spin && "animate-spin")}
        />
      </div>

      {/* Name + repo/branch */}
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {d.release_name}
        </span>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <GitBranch className="size-3 shrink-0" />
          <span className="truncate font-mono">{repoName}</span>
          <span>·</span>
          <span className="font-mono">{d.branch}</span>
          <a
            href={d.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 transition-colors hover:text-primary"
            title="View on GitHub"
          >
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>

      {/* Right metadata */}
      <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
        <span
          className={cn(
            "rounded border px-1.5 py-0.5 text-[10px] font-medium",
            cfg.badgeClass
          )}
        >
          {d.status}
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          <Clock className="size-3" />
          {deployedAt}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "size-7 transition-colors",
            confirming
              ? "text-destructive"
              : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
          )}
          title={confirming ? "Click again to confirm" : "Remove"}
          onClick={handleRemoveClick}
        >
          <Trash2 className="size-3.5" />
        </Button>
        <ChevronRight className="size-3.5 opacity-40" />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface GithubDeploymentsListProps {
  deployments: GithubDeploymentRow[];
  onRemove: (id: string) => void;
}

export function GithubDeploymentsList({
  deployments,
  onRemove,
}: GithubDeploymentsListProps) {
  // Group by namespace
  const grouped: Record<string, GithubDeploymentRow[]> = {};
  for (const d of deployments) {
    const ns = d.namespace || "default";
    if (!grouped[ns]) grouped[ns] = [];
    grouped[ns].push(d);
  }
  const sortedNamespaces = Object.keys(grouped).sort();

  const deployedCount = deployments.filter((d) => d.status === "deployed").length;
  const failedCount = deployments.filter((d) => d.status === "failed").length;

  return (
    <div className="space-y-3">
      {/* Summary row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-medium">
          {deployments.length} deployment{deployments.length !== 1 ? "s" : ""}
        </span>
        {deployedCount > 0 && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              {deployedCount} active
            </span>
          </>
        )}
        {failedCount > 0 && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <span className="text-red-600 dark:text-red-400">
              {failedCount} failed
            </span>
          </>
        )}
      </div>

      {/* Namespace-grouped list */}
      <div className="space-y-4">
        {sortedNamespaces.map((ns) => (
          <div key={ns}>
            <div className="mb-2 flex items-center gap-1.5">
              <FolderOpen className="size-3.5 text-muted-foreground" />
              <h3 className="font-mono text-sm font-medium">{ns}</h3>
              <span className="text-xs text-muted-foreground">
                ({grouped[ns].length})
              </span>
            </div>
            <div className="divide-y overflow-hidden rounded-lg border">
              {grouped[ns].map((d) => (
                <DeploymentRow key={d.id} d={d} onRemove={onRemove} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

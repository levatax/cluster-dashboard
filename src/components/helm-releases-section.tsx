"use client";

import { useState, useMemo } from "react";
import {
  Search,
  X,
  Anchor,
  CheckCircle2,
  XCircle,
  Loader2,
  HelpCircle,
  Minus,
  FolderOpen,
  Clock,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { uninstallHelmRelease } from "@/app/actions/kubernetes";
import type { HelmRelease } from "@/lib/helm";

// ─── Status config ─────────────────────────────────────────────────────────

type StatusCfg = { icon: React.ElementType; color: string; spin?: boolean };

const STATUS_CFG: Record<string, StatusCfg> = {
  deployed:           { icon: CheckCircle2, color: "text-emerald-500" },
  failed:             { icon: XCircle,      color: "text-red-500" },
  "pending-install":  { icon: Loader2,      color: "text-amber-500", spin: true },
  "pending-upgrade":  { icon: Loader2,      color: "text-amber-500", spin: true },
  "pending-rollback": { icon: Loader2,      color: "text-amber-500", spin: true },
  superseded:         { icon: Minus,        color: "text-muted-foreground" },
  uninstalled:        { icon: Minus,        color: "text-muted-foreground" },
};
const DEFAULT_CFG: StatusCfg = { icon: HelpCircle, color: "text-muted-foreground" };

type StatusFilter = "all" | "deployed" | "failed" | "pending";

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Split "postgresql-12.3.1" → { name: "postgresql", version: "12.3.1" }
 * Handles multi-word names: "kube-state-metrics-5.16.0" → { name: "kube-state-metrics", version: "5.16.0" }
 */
function parseChart(chart: string): { name: string; version: string } {
  const match = chart.match(/^(.+)-(\d+\.\d+[\w.-]*)$/);
  if (match) return { name: match[1], version: match[2] };
  return { name: chart, version: "" };
}

function timeAgo(updated: string): string {
  try {
    const d = new Date(
      updated.replace(/ \+\d+ \w+$/, "Z").replace(" ", "T")
    );
    if (isNaN(d.getTime())) return updated;
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 2)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  } catch {
    return updated;
  }
}

// ─── Component ─────────────────────────────────────────────────────────────

interface HelmReleasesSectionProps {
  releases: HelmRelease[];
  clusterId: string;
  onRefresh: () => void;
}

export function HelmReleasesSection({
  releases,
  clusterId,
  onRefresh,
}: HelmReleasesSectionProps) {
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [uninstalling, setUninstalling] = useState<string | null>(null);

  // ── Aggregate stats ──
  const deployedCount = useMemo(
    () => releases.filter((r) => r.status.toLowerCase() === "deployed").length,
    [releases]
  );
  const failedCount = useMemo(
    () => releases.filter((r) => r.status.toLowerCase() === "failed").length,
    [releases]
  );
  const pendingCount = useMemo(
    () => releases.filter((r) => r.status.toLowerCase().startsWith("pending")).length,
    [releases]
  );

  // ── Filtered list ──
  const filtered = useMemo(() => {
    let r = releases;
    if (statusFilter === "deployed") r = r.filter((rel) => rel.status.toLowerCase() === "deployed");
    if (statusFilter === "failed")   r = r.filter((rel) => rel.status.toLowerCase() === "failed");
    if (statusFilter === "pending")  r = r.filter((rel) => rel.status.toLowerCase().startsWith("pending"));

    if (search) {
      const q = search.toLowerCase();
      r = r.filter(
        (rel) =>
          rel.name.toLowerCase().includes(q) ||
          rel.chart.toLowerCase().includes(q) ||
          rel.namespace.toLowerCase().includes(q) ||
          (rel.app_version ?? "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [releases, statusFilter, search]);

  // ── Group by namespace ──
  const grouped = useMemo(() => {
    const g: Record<string, HelmRelease[]> = {};
    for (const rel of filtered) {
      const ns = rel.namespace || "default";
      if (!g[ns]) g[ns] = [];
      g[ns].push(rel);
    }
    return g;
  }, [filtered]);

  const sortedNamespaces = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  // ── Uninstall ──
  async function handleUninstall(releaseName: string, namespace: string) {
    const key = `${namespace}/${releaseName}`;
    setUninstalling(key);
    try {
      const result = await uninstallHelmRelease(clusterId, releaseName, namespace);
      if (result.success) {
        toast.success(`Uninstalled "${releaseName}"`);
        onRefresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to uninstall release");
    } finally {
      setUninstalling(null);
    }
  }

  // ── Empty state ──
  if (releases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Anchor className="mb-3 size-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No Helm releases found</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Install a Helm chart to see it here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* Header */}
      <div>
        <h2 className="text-base font-semibold">Helm Releases</h2>
        <p className="text-sm text-muted-foreground">
          Manage Helm releases deployed on this cluster
        </p>
      </div>

      {/* ── Summary ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-medium">
          {releases.length} release{releases.length !== 1 ? "s" : ""}
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-emerald-600 dark:text-emerald-400">
          {deployedCount} deployed
        </span>
        {failedCount > 0 && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="flex items-center gap-1 font-medium text-red-600 dark:text-red-400">
              <AlertTriangle className="size-3.5" />
              {failedCount} failed
            </span>
          </>
        )}
        {pendingCount > 0 && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-amber-600 dark:text-amber-400">
              {pendingCount} pending
            </span>
          </>
        )}
      </div>

      {/* ── Search + filters ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, chart, namespace, version…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
              onClick={() => setSearch("")}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>

        <div className="flex gap-1">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => setStatusFilter("all")}
          >
            All ({releases.length})
          </Button>
          <Button
            variant={statusFilter === "deployed" ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => setStatusFilter("deployed")}
          >
            Deployed ({deployedCount})
          </Button>
          {failedCount > 0 && (
            <Button
              variant={statusFilter === "failed" ? "default" : "outline"}
              size="sm"
              className={cn(
                "text-xs",
                statusFilter !== "failed" &&
                  "border-red-500/40 text-red-600 hover:bg-red-500/10 dark:text-red-400"
              )}
              onClick={() => setStatusFilter("failed")}
            >
              <AlertTriangle className="mr-1 size-3" />
              Failed ({failedCount})
            </Button>
          )}
          {pendingCount > 0 && (
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setStatusFilter("pending")}
            >
              Pending ({pendingCount})
            </Button>
          )}
        </div>
      </div>

      {/* ── No filter results ────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No releases match the current filters.
        </p>
      ) : (
        /* ── Namespace-grouped list ─────────────────────────────── */
        <div className="space-y-4">
          {sortedNamespaces.map((ns) => (
            <div key={ns}>
              <div className="flex items-center gap-1.5 mb-2">
                <FolderOpen className="size-3.5 text-muted-foreground" />
                <span className="text-sm font-medium font-mono">{ns}</span>
                <span className="text-xs text-muted-foreground">
                  ({grouped[ns].length})
                </span>
              </div>

              <div className="rounded-lg border divide-y overflow-hidden">
                {grouped[ns].map((release) => {
                  const s          = release.status.toLowerCase();
                  const cfg        = STATUS_CFG[s] ?? DEFAULT_CFG;
                  const StatusIcon = cfg.icon;
                  const { name: chartName, version: chartVersion } = parseChart(release.chart);
                  const isFailed       = s === "failed";
                  const releaseKey     = `${release.namespace}/${release.name}`;
                  const isUninstalling = uninstalling === releaseKey;

                  return (
                    <div
                      key={releaseKey}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2.5 transition-colors",
                        isFailed
                          ? "bg-red-500/5 hover:bg-red-500/10"
                          : "hover:bg-muted/40"
                      )}
                    >
                      {/* Status icon */}
                      <StatusIcon
                        className={cn(
                          "size-4 shrink-0",
                          cfg.color,
                          cfg.spin && "animate-spin"
                        )}
                      />

                      {/* Name + chart info */}
                      <div className="min-w-0 flex-1">
                        {/* Release name + app version pill */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium truncate">
                            {release.name}
                          </span>
                          {release.app_version && (
                            <span className="shrink-0 inline-flex items-center gap-0.5 font-mono text-[10px] px-1.5 rounded bg-muted text-muted-foreground">
                              <Package className="size-2.5" />
                              {release.app_version}
                            </span>
                          )}
                        </div>

                        {/* Chart name · chart version · revision */}
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                          <span className="font-mono">{chartName}</span>
                          {chartVersion && (
                            <>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="font-mono">{chartVersion}</span>
                            </>
                          )}
                          <span className="text-muted-foreground/40">·</span>
                          <span className="flex items-center gap-0.5">
                            <RefreshCw className="size-3" />
                            rev&nbsp;{release.revision}
                          </span>
                        </div>
                      </div>

                      {/* Right side: relative time + uninstall on hover */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="size-3" />
                          {timeAgo(release.updated)}
                        </span>

                        <div
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-destructive"
                                disabled={isUninstalling}
                                title="Uninstall release"
                              >
                                {isUninstalling ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="size-3.5" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Uninstall &ldquo;{release.name}&rdquo;?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove <strong>{release.name}</strong> from
                                  namespace <strong>{release.namespace}</strong> and delete
                                  all associated resources. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() =>
                                    handleUninstall(release.name, release.namespace)
                                  }
                                >
                                  Uninstall
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

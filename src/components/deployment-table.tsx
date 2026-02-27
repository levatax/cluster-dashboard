"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderOpen,
  ChevronRight,
  Clock,
  Minus,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExportDropdown } from "@/components/export-dropdown";
import { scaleDeploymentAction } from "@/app/actions/kubernetes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { DeploymentInfo } from "@/lib/types";
import type { ExportColumn } from "@/lib/export";

// ─── Health helpers ───────────────────────────────────────────────────────────

type Health = "Healthy" | "Progressing" | "Degraded";

function getHealth(dep: DeploymentInfo): Health {
  const [ready, desired] = dep.ready.split("/").map(Number);
  if (ready === desired && desired > 0) return "Healthy";
  const progressing = dep.conditions.find((c) => c.type === "Progressing");
  if (progressing?.status === "True") return "Progressing";
  return "Degraded";
}

const HEALTH_CFG: Record<Health, { icon: React.ElementType; color: string; spin?: boolean }> = {
  Healthy:     { icon: CheckCircle2, color: "text-emerald-500" },
  Progressing: { icon: Loader2,      color: "text-amber-500", spin: true },
  Degraded:    { icon: AlertCircle,  color: "text-red-500" },
};

// ─── Deployment row ───────────────────────────────────────────────────────────

interface DeploymentRowProps {
  dep: DeploymentInfo & { health: Health };
  clusterId: string;
  onSelect: (dep: DeploymentInfo) => void;
  onRefresh?: () => void;
}

function DeploymentRow({ dep, clusterId, onSelect, onRefresh }: DeploymentRowProps) {
  const [pendingReplicas, setPendingReplicas] = useState(dep.replicas);
  const [scaling, setScaling] = useState(false);

  // Keep in sync with live data when not mid-edit
  useEffect(() => {
    if (!scaling) setPendingReplicas(dep.replicas);
  }, [dep.replicas, scaling]);

  const { icon: Icon, color, spin } = HEALTH_CFG[dep.health];
  const hasPendingChange = pendingReplicas !== dep.replicas;

  async function applyScale(e: React.MouseEvent) {
    e.stopPropagation();
    setScaling(true);
    try {
      const result = await scaleDeploymentAction(clusterId, dep.namespace, dep.name, pendingReplicas);
      if (result.success) {
        toast.success(`Scaled "${dep.name}" to ${pendingReplicas}`);
        onRefresh?.();
      } else {
        toast.error(result.error);
        setPendingReplicas(dep.replicas);
      }
    } finally {
      setScaling(false);
    }
  }

  return (
    <div
      className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40 cursor-pointer"
      onClick={() => onSelect(dep)}
    >
      {/* Health icon */}
      <Icon className={cn("size-4 shrink-0", color, spin && "animate-spin")} />

      {/* Name */}
      <div className="min-w-0 flex-1">
        <span className="block truncate font-mono text-sm font-medium">{dep.name}</span>
      </div>

      {/* Right-side metadata — stop propagation so scale clicks don't open the sheet */}
      <div
        className="flex shrink-0 items-center gap-2.5 text-[11px] text-muted-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ready ratio */}
        <span className="tabular-nums">{dep.ready}</span>

        {/* Age */}
        <span className="hidden items-center gap-0.5 sm:flex">
          <Clock className="size-3" />
          {dep.age}
        </span>

        {/* Inline scale — hidden until hover (or pending change) */}
        <div
          className={cn(
            "flex items-center gap-0.5 transition-opacity",
            hasPendingChange ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-foreground"
            disabled={scaling || pendingReplicas <= 0}
            onClick={(e) => {
              e.stopPropagation();
              setPendingReplicas((r) => Math.max(0, r - 1));
            }}
          >
            <Minus className="size-3" />
          </Button>
          <span className="w-5 text-center text-xs font-medium tabular-nums">
            {pendingReplicas}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-foreground"
            disabled={scaling}
            onClick={(e) => {
              e.stopPropagation();
              setPendingReplicas((r) => r + 1);
            }}
          >
            <Plus className="size-3" />
          </Button>
          {hasPendingChange && (
            <Button
              size="sm"
              className="ml-0.5 h-6 px-2 text-xs"
              disabled={scaling}
              onClick={applyScale}
            >
              {scaling ? <Loader2 className="size-3 animate-spin" /> : "Apply"}
            </Button>
          )}
        </div>

        <ChevronRight className="size-3.5 opacity-40" />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type StatusFilter = "all" | "healthy" | "degraded" | "progressing";

interface DeploymentTableProps {
  deployments: DeploymentInfo[];
  onSelect: (deployment: DeploymentInfo) => void;
  clusterId?: string;
  onRefresh?: () => void;
}

export function DeploymentTable({
  deployments,
  onSelect,
  clusterId = "",
  onRefresh,
}: DeploymentTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const withHealth = useMemo(
    () => deployments.map((d) => ({ ...d, health: getHealth(d) })),
    [deployments]
  );

  const healthyCount     = useMemo(() => withHealth.filter((d) => d.health === "Healthy").length,     [withHealth]);
  const degradedCount    = useMemo(() => withHealth.filter((d) => d.health === "Degraded").length,    [withHealth]);
  const progressingCount = useMemo(() => withHealth.filter((d) => d.health === "Progressing").length, [withHealth]);

  const filtered = useMemo(() => {
    let result = withHealth;
    if (statusFilter === "healthy")     result = result.filter((d) => d.health === "Healthy");
    if (statusFilter === "degraded")    result = result.filter((d) => d.health === "Degraded");
    if (statusFilter === "progressing") result = result.filter((d) => d.health === "Progressing");
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) => d.name.toLowerCase().includes(q) || d.namespace.toLowerCase().includes(q)
      );
    }
    return result;
  }, [withHealth, statusFilter, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, (DeploymentInfo & { health: Health })[]> = {};
    for (const dep of filtered) {
      if (!groups[dep.namespace]) groups[dep.namespace] = [];
      groups[dep.namespace].push(dep);
    }
    return groups;
  }, [filtered]);

  const sortedNamespaces = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  const exportColumns: ExportColumn<DeploymentInfo>[] = useMemo(
    () => [
      { key: "name",      header: "Name" },
      { key: "namespace", header: "Namespace" },
      { key: "ready",     header: "Ready" },
      { key: "replicas",  header: "Replicas" },
      { key: "upToDate",  header: "Up-to-date" },
      { key: "available", header: "Available" },
      { key: "age",       header: "Age" },
    ],
    []
  );

  if (deployments.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">No deployments found.</p>;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold">Deployments</h2>
        <p className="text-sm text-muted-foreground">Manage and monitor application deployments</p>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-medium">{deployments.length} deployments</span>
        <span className="text-muted-foreground/50">·</span>
        <span className="text-emerald-600 dark:text-emerald-400">{healthyCount} healthy</span>
        {degradedCount > 0 && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <AlertTriangle className="size-3.5" />
              {degradedCount} degraded
            </span>
          </>
        )}
        {progressingCount > 0 && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <span className="text-amber-600 dark:text-amber-400">{progressingCount} progressing</span>
          </>
        )}
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or namespace…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
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
            All ({deployments.length})
          </Button>
          <Button
            variant={statusFilter === "healthy" ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => setStatusFilter("healthy")}
          >
            Healthy ({healthyCount})
          </Button>
          {degradedCount > 0 && (
            <Button
              variant={statusFilter === "degraded" ? "default" : "outline"}
              size="sm"
              className={cn(
                "text-xs",
                statusFilter !== "degraded" &&
                  "border-red-500/40 text-red-600 hover:bg-red-500/10 dark:text-red-400"
              )}
              onClick={() => setStatusFilter("degraded")}
            >
              <AlertTriangle className="mr-1 size-3" />
              Degraded ({degradedCount})
            </Button>
          )}
          {progressingCount > 0 && (
            <Button
              variant={statusFilter === "progressing" ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setStatusFilter("progressing")}
            >
              Progressing ({progressingCount})
            </Button>
          )}
        </div>

        {statusFilter !== "all" && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setStatusFilter("all")}
            >
              <X className="mr-1 size-3" />
              Clear
            </Button>
          </>
        )}

        <div className="ml-auto">
          <ExportDropdown data={filtered} columns={exportColumns} filename="deployments" />
        </div>
      </div>

      {/* Namespace-grouped list */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No deployments match the current filters.
        </p>
      ) : (
        <div className="space-y-4">
          {sortedNamespaces.map((ns) => (
            <div key={ns}>
              <div className="mb-2 flex items-center gap-1.5">
                <FolderOpen className="size-3.5 text-muted-foreground" />
                <h3 className="font-mono text-sm font-medium">{ns}</h3>
                <span className="text-xs text-muted-foreground">({grouped[ns].length})</span>
              </div>
              <div className="divide-y overflow-hidden rounded-lg border">
                {grouped[ns].map((dep) => (
                  <DeploymentRow
                    key={`${dep.namespace}/${dep.name}`}
                    dep={dep}
                    clusterId={clusterId}
                    onSelect={onSelect}
                    onRefresh={onRefresh}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

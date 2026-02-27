"use client";

import { useState, useMemo } from "react";
import {
  Search,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  Skull,
  Clock,
  HelpCircle,
  ImageOff,
  Power,
  FolderOpen,
  FileText,
  Terminal as TerminalIcon,
  ChevronRight,
  Server,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExportDropdown } from "@/components/export-dropdown";
import { cn } from "@/lib/utils";
import type { ExportColumn } from "@/lib/export";
import type { PodInfo } from "@/lib/types";

// ─── Status config ─────────────────────────────────────────────────────────

type StatusCfg = {
  icon: React.ElementType;
  color: string;
  spin?: boolean;
};

const STATUS_CFG: Record<string, StatusCfg> = {
  Running:           { icon: CheckCircle2, color: "text-emerald-500" },
  Succeeded:         { icon: CheckCircle2, color: "text-blue-500" },
  Completed:         { icon: CheckCircle2, color: "text-blue-500" },
  Pending:           { icon: Loader2,      color: "text-yellow-500", spin: true },
  ContainerCreating: { icon: Loader2,      color: "text-blue-500",   spin: true },
  Failed:            { icon: XCircle,      color: "text-red-500" },
  CrashLoopBackOff:  { icon: Skull,        color: "text-red-500" },
  OOMKilled:         { icon: XCircle,      color: "text-red-500" },
  ImagePullBackOff:  { icon: ImageOff,     color: "text-orange-500" },
  ErrImagePull:      { icon: ImageOff,     color: "text-orange-500" },
  Terminating:       { icon: Power,        color: "text-muted-foreground" },
  Error:             { icon: XCircle,      color: "text-red-500" },
};

const DEFAULT_CFG: StatusCfg = { icon: HelpCircle, color: "text-muted-foreground" };

function getStatusCfg(status: string): StatusCfg {
  return STATUS_CFG[status] ?? DEFAULT_CFG;
}

function isProblem(pod: PodInfo): boolean {
  return (
    ["Failed", "CrashLoopBackOff", "OOMKilled", "ImagePullBackOff", "ErrImagePull", "Error"].includes(
      pod.status
    ) || pod.restarts > 5
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "running" | "problem" | "pending";

interface PodTableProps {
  pods: PodInfo[];
  onSelect: (pod: PodInfo) => void;
  onViewLogs?: (pod: PodInfo) => void;
  onOpenTerminal?: (pod: PodInfo) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function PodTable({ pods, onSelect, onViewLogs, onOpenTerminal }: PodTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const runningCount = useMemo(() => pods.filter((p) => p.status === "Running").length, [pods]);
  const problemCount = useMemo(() => pods.filter(isProblem).length, [pods]);
  const pendingCount = useMemo(
    () => pods.filter((p) => p.status === "Pending" || p.status === "ContainerCreating").length,
    [pods]
  );

  const filtered = useMemo(() => {
    let result = pods;

    if (statusFilter === "running") result = result.filter((p) => p.status === "Running");
    else if (statusFilter === "problem") result = result.filter(isProblem);
    else if (statusFilter === "pending")
      result = result.filter(
        (p) => p.status === "Pending" || p.status === "ContainerCreating"
      );

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.namespace.toLowerCase().includes(q) ||
          p.node.toLowerCase().includes(q) ||
          p.ip.toLowerCase().includes(q)
      );
    }

    return result;
  }, [pods, search, statusFilter]);

  const grouped = useMemo(() => {
    const groups: Record<string, PodInfo[]> = {};
    for (const pod of filtered) {
      const ns = pod.namespace || "default";
      if (!groups[ns]) groups[ns] = [];
      groups[ns].push(pod);
    }
    return groups;
  }, [filtered]);

  const sortedNamespaces = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  const exportColumns: ExportColumn<PodInfo>[] = useMemo(
    () => [
      { key: "name", header: "Name" },
      { key: "namespace", header: "Namespace" },
      { key: "status", header: "Status" },
      { key: "ready", header: "Ready" },
      { key: "restarts", header: "Restarts" },
      { key: "age", header: "Age" },
      { key: "node", header: "Node" },
      { key: "ip", header: "IP" },
    ],
    []
  );

  if (pods.length === 0) {
    return <p className="text-muted-foreground py-8 text-center">No pods found.</p>;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold">Pods</h2>
        <p className="text-sm text-muted-foreground">Running containers and their current status</p>
      </div>

      {/* Summary row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-medium">{pods.length} pods</span>
        <span className="text-muted-foreground/50">·</span>
        <span className="text-emerald-600 dark:text-emerald-400">
          {runningCount} running
        </span>
        {problemCount > 0 && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <AlertTriangle className="size-3.5" />
              {problemCount} problem{problemCount !== 1 ? "s" : ""}
            </span>
          </>
        )}
        {pendingCount > 0 && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <span className="text-yellow-600 dark:text-yellow-400">
              {pendingCount} pending
            </span>
          </>
        )}
      </div>

      {/* Search + status filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, namespace, node, IP…"
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
            All ({pods.length})
          </Button>
          <Button
            variant={statusFilter === "running" ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => setStatusFilter("running")}
          >
            Running ({runningCount})
          </Button>
          {problemCount > 0 && (
            <Button
              variant={statusFilter === "problem" ? "default" : "outline"}
              size="sm"
              className={cn(
                "text-xs",
                statusFilter !== "problem" &&
                  "border-red-500/40 text-red-600 hover:bg-red-500/10 dark:text-red-400"
              )}
              onClick={() => setStatusFilter("problem")}
            >
              <AlertTriangle className="mr-1 size-3" />
              Problems ({problemCount})
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
          <ExportDropdown data={filtered} columns={exportColumns} filename="pods" />
        </div>
      </div>

      {/* Namespace-grouped list */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No pods match the current filters.
        </p>
      ) : (
        <div className="space-y-4">
          {sortedNamespaces.map((ns) => (
            <div key={ns}>
              <div className="flex items-center gap-1.5 mb-2">
                <FolderOpen className="size-3.5 text-muted-foreground" />
                <h3 className="text-sm font-medium font-mono">{ns}</h3>
                <span className="text-xs text-muted-foreground">({grouped[ns].length})</span>
              </div>

              <div className="rounded-lg border divide-y overflow-hidden">
                {grouped[ns].map((pod) => {
                  const cfg = getStatusCfg(pod.status);
                  const StatusIcon = cfg.icon;
                  const hasActions = onViewLogs || onOpenTerminal;

                  return (
                    <div
                      key={pod.name}
                      className="group flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => onSelect(pod)}
                    >
                      {/* Status icon */}
                      <StatusIcon
                        className={cn("size-4 shrink-0", cfg.color, cfg.spin && "animate-spin")}
                      />

                      {/* Name + node/IP */}
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-sm font-medium truncate block">
                          {pod.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                          {pod.node && (
                            <span className="flex items-center gap-1">
                              <Server className="size-3 shrink-0" />
                              <span className="font-mono truncate max-w-[160px]">{pod.node}</span>
                            </span>
                          )}
                          {pod.ip && (
                            <span className="font-mono hidden sm:inline">{pod.ip}</span>
                          )}
                        </div>
                      </div>

                      {/* Right side metadata */}
                      <div className="flex items-center gap-2.5 shrink-0 text-[11px] text-muted-foreground">
                        {/* Ready ratio */}
                        <span className="tabular-nums">{pod.ready}</span>

                        {/* Restart count */}
                        {pod.restarts > 0 ? (
                          <span
                            className={cn(
                              "flex items-center gap-0.5 font-medium",
                              pod.restarts > 5 ? "text-red-500" : "text-amber-500 dark:text-amber-400"
                            )}
                          >
                            <RefreshCw className="size-3" />
                            {pod.restarts}
                          </span>
                        ) : null}

                        {/* Age */}
                        <span className="flex items-center gap-0.5">
                          <Clock className="size-3" />
                          {pod.age}
                        </span>

                        {/* Quick actions (logs + terminal) */}
                        {hasActions && (
                          <div
                            className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {onViewLogs && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-foreground"
                                title="View logs"
                                onClick={() => onViewLogs(pod)}
                              >
                                <FileText className="size-3.5" />
                              </Button>
                            )}
                            {onOpenTerminal && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-foreground"
                                title="Open terminal"
                                onClick={() => onOpenTerminal(pod)}
                              >
                                <TerminalIcon className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        )}

                        <ChevronRight className="size-3.5 opacity-40" />
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

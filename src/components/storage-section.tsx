"use client";

import { useState, useMemo } from "react";
import {
  Search,
  X,
  FolderOpen,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  HelpCircle,
  HardDrive,
  Layers,
  Database,
  ChevronRight,
  ChevronDown,
  Clock,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExportDropdown } from "@/components/export-dropdown";
import { cn } from "@/lib/utils";
import type { ExportColumn } from "@/lib/export";
import type {
  PersistentVolumeInfo,
  PersistentVolumeClaimInfo,
  StorageClassInfo,
} from "@/lib/types";

// ─── Constants ─────────────────────────────────────────────────────────────

const ACCESS_MODE_ABBR: Record<string, string> = {
  ReadWriteOnce: "RWO",
  ReadOnlyMany: "ROX",
  ReadWriteMany: "RWX",
  ReadWriteOncePod: "RWOP",
};

type PvcStatusCfg = { icon: React.ElementType; color: string; spin: boolean };

const PVC_STATUS_CFG: Record<string, PvcStatusCfg> = {
  Bound:   { icon: CheckCircle2,  color: "text-emerald-500", spin: false },
  Pending: { icon: Loader2,       color: "text-amber-500",   spin: true  },
  Lost:    { icon: AlertTriangle, color: "text-red-500",     spin: false },
};
const PVC_DEFAULT_CFG: PvcStatusCfg = { icon: HelpCircle, color: "text-muted-foreground", spin: false };

const PV_STATUS_STYLE: Record<string, string> = {
  Available: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Bound:     "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Released:  "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Failed:    "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
};

type PvcFilter = "all" | "Bound" | "Pending" | "Lost";

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatCapacity(bytes: number): string {
  if (bytes === 0) return "0";
  const gi = bytes / 1024 ** 3;
  if (gi >= 1024) return `${(gi / 1024).toFixed(1)} Ti`;
  if (gi >= 1) return `${gi.toFixed(1)} Gi`;
  const mi = bytes / 1024 ** 2;
  if (mi >= 1) return `${mi.toFixed(0)} Mi`;
  return `${(bytes / 1024).toFixed(0)} Ki`;
}

function abbreviateModes(modes: string[]): string {
  return modes.map((m) => ACCESS_MODE_ABBR[m] ?? m).join(", ");
}

// ─── Main component ────────────────────────────────────────────────────────

interface StorageSectionProps {
  pvs: PersistentVolumeInfo[];
  pvcs: PersistentVolumeClaimInfo[];
  storageClasses: StorageClassInfo[];
}

export function StorageSection({ pvs, pvcs, storageClasses }: StorageSectionProps) {
  const [search, setSearch] = useState("");
  const [pvcFilter, setPvcFilter] = useState<PvcFilter>("all");
  const [showPVs, setShowPVs] = useState(false);

  // ── Aggregate stats ──
  const boundCount   = useMemo(() => pvcs.filter((p) => p.status === "Bound").length,   [pvcs]);
  const lostCount    = useMemo(() => pvcs.filter((p) => p.status === "Lost").length,    [pvcs]);
  const pendingCount = useMemo(() => pvcs.filter((p) => p.status === "Pending").length, [pvcs]);
  const totalBytes   = useMemo(() => pvs.reduce((s, pv) => s + pv.capacityBytes, 0),   [pvs]);
  const defaultClass = useMemo(() => storageClasses.find((sc) => sc.isDefault)?.name,  [storageClasses]);

  // ── Filtered PVCs ──
  const filteredPvcs = useMemo(() => {
    let r = pvcs;
    if (pvcFilter !== "all") r = r.filter((p) => p.status === pvcFilter);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.namespace.toLowerCase().includes(q) ||
          p.volumeName.toLowerCase().includes(q) ||
          p.storageClassName.toLowerCase().includes(q) ||
          p.usedByPods.some((pod) => pod.toLowerCase().includes(q))
      );
    }
    return r;
  }, [pvcs, pvcFilter, search]);

  // ── PVC groups by namespace ──
  const groupedPvcs = useMemo(() => {
    const g: Record<string, PersistentVolumeClaimInfo[]> = {};
    for (const pvc of filteredPvcs) {
      const ns = pvc.namespace || "default";
      if (!g[ns]) g[ns] = [];
      g[ns].push(pvc);
    }
    return g;
  }, [filteredPvcs]);

  const pvcNamespaces = useMemo(() => Object.keys(groupedPvcs).sort(), [groupedPvcs]);

  // ── Sorted storage classes & PVs ──
  const sortedSCs = useMemo(
    () => [...storageClasses].sort((a, b) => (a.isDefault ? -1 : b.isDefault ? 1 : 0) || a.name.localeCompare(b.name)),
    [storageClasses]
  );
  const sortedPVs = useMemo(() => [...pvs].sort((a, b) => a.name.localeCompare(b.name)), [pvs]);

  const pvcExportCols: ExportColumn<PersistentVolumeClaimInfo>[] = [
    { key: "name",             header: "Name"          },
    { key: "namespace",        header: "Namespace"     },
    { key: "status",           header: "Status"        },
    { key: "storageClassName", header: "Storage Class" },
    { key: "requestedCapacity",header: "Capacity"      },
    { key: "age",              header: "Age"           },
  ];

  const isEmpty = pvcs.length === 0 && pvs.length === 0 && storageClasses.length === 0;
  if (isEmpty) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No storage resources found.
      </p>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-base font-semibold">Storage</h2>
        <p className="text-sm text-muted-foreground">Persistent volumes, claims, and storage classes</p>
      </div>

      {/* ── Summary ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {totalBytes > 0 && (
          <>
            <span className="font-medium">{formatCapacity(totalBytes)} total</span>
            <span className="text-muted-foreground/40">·</span>
          </>
        )}
        <span className="text-emerald-600 dark:text-emerald-400">{boundCount} bound</span>
        {lostCount > 0 && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="flex items-center gap-1 font-medium text-red-600 dark:text-red-400">
              <AlertTriangle className="size-3.5" />
              {lostCount} lost
            </span>
          </>
        )}
        {pendingCount > 0 && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-amber-600 dark:text-amber-400">{pendingCount} pending</span>
          </>
        )}
        {defaultClass && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-muted-foreground">
              default: <span className="font-mono">{defaultClass}</span>
            </span>
          </>
        )}
      </div>

      {/* ── Volume Claims ─────────────────────────────────────────── */}
      {pvcs.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <HardDrive className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Volume Claims</h3>
            <span className="text-xs text-muted-foreground">({pvcs.length})</span>
          </div>

          {/* Search + filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, namespace, pod, volume…"
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
              {(["all", "Bound", "Pending", "Lost"] as const).map((f) => {
                const count =
                  f === "all" ? pvcs.length :
                  f === "Bound" ? boundCount :
                  f === "Pending" ? pendingCount :
                  lostCount;
                if (f !== "all" && count === 0) return null;
                return (
                  <Button
                    key={f}
                    variant={pvcFilter === f ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "text-xs",
                      f === "Lost" && pvcFilter !== "Lost" &&
                        "border-red-500/40 text-red-600 hover:bg-red-500/10 dark:text-red-400"
                    )}
                    onClick={() => setPvcFilter(f)}
                  >
                    {f === "all" ? "All" : f} ({count})
                  </Button>
                );
              })}
            </div>

            <div className="ml-auto">
              <ExportDropdown data={filteredPvcs} columns={pvcExportCols} filename="pvcs" />
            </div>
          </div>

          {/* Namespace-grouped PVC list */}
          {filteredPvcs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No volume claims match the current filters.
            </p>
          ) : (
            <div className="space-y-4">
              {pvcNamespaces.map((ns) => (
                <div key={ns}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <FolderOpen className="size-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium font-mono">{ns}</span>
                    <span className="text-xs text-muted-foreground">
                      ({groupedPvcs[ns].length})
                    </span>
                  </div>

                  <div className="rounded-lg border divide-y overflow-hidden">
                    {groupedPvcs[ns].map((pvc) => {
                      const cfg = PVC_STATUS_CFG[pvc.status] ?? PVC_DEFAULT_CFG;
                      const StatusIcon = cfg.icon;
                      const isLost = pvc.status === "Lost";

                      return (
                        <div
                          key={pvc.name}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 transition-colors",
                            isLost
                              ? "bg-red-500/5 hover:bg-red-500/10"
                              : "hover:bg-muted/40"
                          )}
                        >
                          <StatusIcon
                            className={cn(
                              "size-4 shrink-0",
                              cfg.color,
                              cfg.spin && "animate-spin"
                            )}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-medium truncate">{pvc.name}</span>
                              <span className="shrink-0 font-mono text-xs font-semibold">
                                {pvc.actualCapacity || pvc.requestedCapacity}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-muted-foreground">
                              <span className="font-mono">
                                {pvc.storageClassName || "—"}
                              </span>
                              <span className="text-muted-foreground/40">·</span>
                              <span>{abbreviateModes(pvc.accessModes)}</span>
                              {pvc.usedByPods.length > 0 ? (
                                <>
                                  <span className="text-muted-foreground/40">·</span>
                                  <span className="truncate max-w-[220px]">
                                    → {pvc.usedByPods.slice(0, 2).join(", ")}
                                    {pvc.usedByPods.length > 2
                                      ? ` +${pvc.usedByPods.length - 2} more`
                                      : ""}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-muted-foreground/40">·</span>
                                  <span className="italic text-muted-foreground/60">
                                    {isLost ? "lost — no backing volume" : "unattached"}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <span className="flex items-center gap-1 shrink-0 text-[11px] text-muted-foreground">
                            <Clock className="size-3" />
                            {pvc.age}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Storage Classes ───────────────────────────────────────── */}
      {storageClasses.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Storage Classes</h3>
            <span className="text-xs text-muted-foreground">({storageClasses.length})</span>
          </div>

          <div className="rounded-lg border divide-y overflow-hidden">
            {sortedSCs.map((sc) => (
              <div
                key={sc.name}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors"
              >
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md",
                    sc.isDefault ? "bg-blue-500/10" : "bg-muted"
                  )}
                >
                  <Database
                    className={cn(
                      "size-3.5",
                      sc.isDefault
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-muted-foreground"
                    )}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-medium truncate">{sc.name}</span>
                    {sc.isDefault && (
                      <span className="shrink-0 rounded text-[10px] px-1.5 border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400">
                        default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                    <span className="font-mono truncate max-w-[200px]">{sc.provisioner}</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span>{sc.reclaimPolicy}</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span>{sc.volumeBindingMode}</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3 text-[11px]">
                  {sc.allowVolumeExpansion ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <Check className="size-3" />
                      Expandable
                    </span>
                  ) : (
                    <span className="text-muted-foreground/50">Fixed size</span>
                  )}
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="size-3" />
                    {sc.age}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Persistent Volumes (collapsible) ─────────────────────── */}
      {pvs.length > 0 && (
        <section className="space-y-2">
          <button
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowPVs((v) => !v)}
          >
            {showPVs ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
            <HardDrive className="size-4" />
            Persistent Volumes
            <span className="font-normal text-xs">({pvs.length})</span>
          </button>

          {showPVs && (
            <div className="rounded-lg border divide-y overflow-hidden">
              {sortedPVs.map((pv) => (
                <div
                  key={pv.name}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Database className="size-3.5 text-muted-foreground" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium font-mono truncate">{pv.name}</span>
                      <span className="shrink-0 font-mono text-xs font-semibold">{pv.capacity}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <span>{pv.storageClassName || "—"}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span>{abbreviateModes(pv.accessModes)}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span>{pv.reclaimPolicy}</span>
                      {pv.claimRef && (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="font-mono truncate max-w-[180px]">
                            → {pv.claimRef}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={cn(
                        "rounded text-[10px] px-1.5 border",
                        PV_STATUS_STYLE[pv.status] ??
                          "border-muted-foreground/30 bg-muted text-muted-foreground"
                      )}
                    >
                      {pv.status}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="size-3" />
                      {pv.age}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

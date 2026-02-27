"use client";

import { useState, useMemo } from "react";
import { HardDrive, FileVolume2, Database, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PersistentVolumeTable } from "@/components/persistent-volume-table";
import { PersistentVolumeClaimTable } from "@/components/persistent-volume-claim-table";
import { StorageClassTable } from "@/components/storage-class-table";
import type {
  PersistentVolumeInfo,
  PersistentVolumeClaimInfo,
  StorageClassInfo,
} from "@/lib/types";

type StorageSubTab = "pvcs" | "pvs" | "storage-classes";

interface StorageSectionProps {
  pvs: PersistentVolumeInfo[];
  pvcs: PersistentVolumeClaimInfo[];
  storageClasses: StorageClassInfo[];
}

function formatCapacityTotal(bytes: number): string {
  if (bytes === 0) return "0";
  const gi = bytes / (1024 ** 3);
  if (gi >= 1024) {
    const ti = gi / 1024;
    return `${ti.toFixed(1)} Ti`;
  }
  if (gi >= 1) return `${gi.toFixed(1)} Gi`;
  const mi = bytes / (1024 ** 2);
  if (mi >= 1) return `${mi.toFixed(0)} Mi`;
  const ki = bytes / 1024;
  return `${ki.toFixed(0)} Ki`;
}

function StatCard({
  title,
  icon: Icon,
  value,
  total,
  subtitle,
}: {
  title: string;
  icon: React.ElementType;
  value: number;
  total: number;
  subtitle: string;
}) {
  const percent = total > 0 ? (value / total) * 100 : 0;
  const isHealthy = total === 0 || value === total;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="size-4 text-primary" />
          </div>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums">{value}</span>
          {total > 0 && total !== value && (
            <span className="text-sm text-muted-foreground">/ {total}</span>
          )}
        </div>
        {total > 0 && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full transition-all ${
                isHealthy ? "bg-emerald-500" : "bg-amber-500"
              }`}
              style={{ width: `${Math.min(100, percent)}%` }}
            />
          </div>
        )}
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function SimpleStatCard({
  title,
  icon: Icon,
  value,
  subtitle,
}: {
  title: string;
  icon: React.ElementType;
  value: string;
  subtitle: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="size-4 text-primary" />
          </div>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export function StorageSection({
  pvs,
  pvcs,
  storageClasses,
}: StorageSectionProps) {
  const [subTab, setSubTab] = useState<StorageSubTab>("pvcs");

  const pvBoundCount = useMemo(
    () => pvs.filter((pv) => pv.status === "Bound").length,
    [pvs]
  );

  const pvcBoundCount = useMemo(
    () => pvcs.filter((pvc) => pvc.status === "Bound").length,
    [pvcs]
  );

  const totalCapacityBytes = useMemo(
    () => pvs.reduce((sum, pv) => sum + pv.capacityBytes, 0),
    [pvs]
  );

  const defaultClass = useMemo(
    () => storageClasses.find((sc) => sc.isDefault)?.name || "none",
    [storageClasses]
  );

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Persistent Volumes"
          icon={HardDrive}
          value={pvBoundCount}
          total={pvs.length}
          subtitle={pvs.length === 0 ? "No PVs" : `${pvBoundCount} bound`}
        />
        <StatCard
          title="Volume Claims"
          icon={FileVolume2}
          value={pvcBoundCount}
          total={pvcs.length}
          subtitle={pvcs.length === 0 ? "No PVCs" : `${pvcBoundCount} bound`}
        />
        <SimpleStatCard
          title="Total Capacity"
          icon={Database}
          value={totalCapacityBytes > 0 ? formatCapacityTotal(totalCapacityBytes) : "—"}
          subtitle={pvs.length > 0 ? `Across ${pvs.length} volume${pvs.length !== 1 ? "s" : ""}` : "No volumes"}
        />
        <SimpleStatCard
          title="Storage Classes"
          icon={Layers}
          value={String(storageClasses.length)}
          subtitle={`Default: ${defaultClass}`}
        />
      </div>

      {/* Sub-tab buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant={subTab === "pvcs" ? "default" : "outline"}
          size="sm"
          onClick={() => setSubTab("pvcs")}
        >
          PVCs ({pvcs.length})
        </Button>
        <Button
          variant={subTab === "pvs" ? "default" : "outline"}
          size="sm"
          onClick={() => setSubTab("pvs")}
        >
          PVs ({pvs.length})
        </Button>
        <Button
          variant={subTab === "storage-classes" ? "default" : "outline"}
          size="sm"
          onClick={() => setSubTab("storage-classes")}
        >
          Storage Classes ({storageClasses.length})
        </Button>
      </div>

      {/* Active table */}
      {subTab === "pvcs" && <PersistentVolumeClaimTable pvcs={pvcs} />}
      {subTab === "pvs" && <PersistentVolumeTable pvs={pvs} />}
      {subTab === "storage-classes" && <StorageClassTable storageClasses={storageClasses} />}
    </div>
  );
}

"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import { X, LayoutGrid, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeploymentCardView } from "@/components/deployment-card-view";
import { ExportDropdown } from "@/components/export-dropdown";
import type { ExportColumn } from "@/lib/export";
import type { DeploymentInfo } from "@/lib/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

function getDeploymentHealth(dep: DeploymentInfo): string {
  const [ready, desired] = dep.ready.split("/").map(Number);
  if (ready === desired && desired > 0) return "Healthy";
  const progressing = dep.conditions.find((c) => c.type === "Progressing");
  if (progressing?.status === "True") return "Progressing";
  return "Degraded";
}

const healthColors: Record<string, string> = {
  Healthy:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Progressing:
    "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  Degraded:
    "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
};

const VIEW_STORAGE_KEY = "deployment-view-mode";

type ViewMode = "card" | "table";

interface DeploymentTableProps {
  deployments: DeploymentInfo[];
  onSelect: (deployment: DeploymentInfo) => void;
  clusterId?: string;
}

export function DeploymentTable({
  deployments,
  onSelect,
  clusterId = "",
}: DeploymentTableProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [healthFilter, setHealthFilter] = useState<Set<string>>(new Set());

  // Load view preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved === "card" || saved === "table") {
      setViewMode(saved);
    }
  }, []);

  // Save view preference when it changes
  function handleViewChange(value: string) {
    if (value === "card" || value === "table") {
      setViewMode(value);
      localStorage.setItem(VIEW_STORAGE_KEY, value);
    }
  }

  const deploymentsWithHealth = useMemo(
    () => deployments.map((d) => ({ ...d, health: getDeploymentHealth(d) })),
    [deployments]
  );

  const uniqueHealths = useMemo(
    () => [...new Set(deploymentsWithHealth.map((d) => d.health))].sort(),
    [deploymentsWithHealth]
  );

  const filtered = useMemo(() => {
    if (healthFilter.size === 0) return deploymentsWithHealth;
    return deploymentsWithHealth.filter((d) => healthFilter.has(d.health));
  }, [deploymentsWithHealth, healthFilter]);

  function toggleHealth(health: string) {
    setHealthFilter((prev) => {
      const next = new Set(prev);
      if (next.has(health)) next.delete(health);
      else next.add(health);
      return next;
    });
  }

  const exportColumns: ExportColumn<DeploymentInfo>[] = useMemo(
    () => [
      { key: "name", header: "Name" },
      { key: "namespace", header: "Namespace" },
      { key: "ready", header: "Ready" },
      { key: "replicas", header: "Replicas" },
      { key: "upToDate", header: "Up-to-date" },
      { key: "available", header: "Available" },
      { key: "age", header: "Age" },
    ],
    []
  );

  if (deployments.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        No deployments found.
      </p>
    );
  }

  // Card view - shows grouped by namespace with drag-and-drop reordering
  if (viewMode === "card") {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={handleViewChange}
            className="border rounded-md"
          >
            <ToggleGroupItem value="card" aria-label="Card view" className="px-2.5">
              <LayoutGrid className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Table view" className="px-2.5">
              <List className="size-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <span className="text-muted-foreground ml-auto text-sm">
            {deployments.length} deployments
          </span>
          <ExportDropdown data={deployments} columns={exportColumns} filename="deployments" />
        </div>

        <DeploymentCardView
          deployments={deployments}
          onSelect={onSelect}
          clusterId={clusterId}
        />
      </div>
    );
  }

  // Table view - original implementation
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={handleViewChange}
          className="border rounded-md"
        >
          <ToggleGroupItem value="card" aria-label="Card view" className="px-2.5">
            <LayoutGrid className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Table view" className="px-2.5">
            <List className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {uniqueHealths.map((health) => (
          <Button
            key={health}
            variant={healthFilter.has(health) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleHealth(health)}
          >
            {health}
          </Button>
        ))}

        {healthFilter.size > 0 && (
          <>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHealthFilter(new Set())}
            >
              <X className="mr-1 size-3" />
              Clear filters
            </Button>
          </>
        )}

        <span className="text-muted-foreground ml-auto text-sm">
          {filtered.length} of {deployments.length} deployments
        </span>
        <ExportDropdown data={filtered} columns={exportColumns} filename="deployments" />
      </div>

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className="rounded-md border min-w-[550px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Namespace</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ready</TableHead>
              <TableHead className="hidden md:table-cell">Up-to-date</TableHead>
              <TableHead className="hidden md:table-cell">Available</TableHead>
              <TableHead>Age</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-8 text-center"
                >
                  No deployments match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((dep, i) => (
                <motion.tr
                  key={`${dep.namespace}/${dep.name}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.03, ease }}
                  className="border-b cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => onSelect(dep)}
                >
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {dep.name}
                  </TableCell>
                  <TableCell>{dep.namespace}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={healthColors[dep.health] || ""}
                    >
                      {dep.health}
                    </Badge>
                  </TableCell>
                  <TableCell>{dep.ready}</TableCell>
                  <TableCell className="hidden md:table-cell">{dep.upToDate}</TableCell>
                  <TableCell className="hidden md:table-cell">{dep.available}</TableCell>
                  <TableCell>{dep.age}</TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      </div>
    </div>
  );
}

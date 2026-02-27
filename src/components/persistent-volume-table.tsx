"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PersistentVolumeInfo } from "@/lib/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const statusColors: Record<string, string> = {
  Available:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Bound:
    "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Released:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Failed:
    "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
};

const accessModeAbbr: Record<string, string> = {
  ReadWriteOnce: "RWO",
  ReadOnlyMany: "ROX",
  ReadWriteMany: "RWX",
  ReadWriteOncePod: "RWOP",
};

interface PersistentVolumeTableProps {
  pvs: PersistentVolumeInfo[];
}

export function PersistentVolumeTable({ pvs }: PersistentVolumeTableProps) {
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());

  const uniqueStatuses = useMemo(
    () => [...new Set(pvs.map((pv) => pv.status))].sort(),
    [pvs]
  );

  const filtered = useMemo(() => {
    if (statusFilter.size === 0) return pvs;
    return pvs.filter((pv) => statusFilter.has(pv.status));
  }, [pvs, statusFilter]);

  function toggleStatus(status: string) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  if (pvs.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        No persistent volumes found.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {uniqueStatuses.map((status) => (
          <Button
            key={status}
            variant={statusFilter.has(status) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleStatus(status)}
          >
            {status}
          </Button>
        ))}

        {statusFilter.size > 0 && (
          <>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter(new Set())}
            >
              <X className="mr-1 size-3" />
              Clear filters
            </Button>
          </>
        )}

        <span className="text-muted-foreground ml-auto text-sm">
          {filtered.length} of {pvs.length} persistent volumes
        </span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Access Modes</TableHead>
              <TableHead>Reclaim Policy</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Storage Class</TableHead>
              <TableHead>Claim</TableHead>
              <TableHead>Age</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-muted-foreground py-8 text-center"
                >
                  No persistent volumes match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((pv, i) => (
                <motion.tr
                  key={pv.name}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.03, ease }}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {pv.name}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {pv.capacity}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {pv.accessModes.map((mode) => (
                        <Badge key={mode} variant="secondary" className="text-xs">
                          {accessModeAbbr[mode] || mode}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{pv.reclaimPolicy}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusColors[pv.status] || ""}
                    >
                      {pv.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{pv.storageClassName || "—"}</TableCell>
                  <TableCell>
                    {pv.claimRef ? (
                      <span className="font-mono text-sm text-primary">
                        {pv.claimRef}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{pv.age}</TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

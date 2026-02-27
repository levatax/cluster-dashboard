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
import { ExportDropdown } from "@/components/export-dropdown";
import type { ExportColumn } from "@/lib/export";
import type { PodInfo } from "@/lib/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const statusColors: Record<string, string> = {
  Running:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Succeeded:
    "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Pending:
    "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  Failed:
    "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
  CrashLoopBackOff:
    "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
  OOMKilled:
    "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
  ImagePullBackOff:
    "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  Terminating:
    "border-gray-500/30 bg-gray-500/10 text-gray-700 dark:text-gray-400",
};

const defaultStatusColor =
  "border-gray-500/30 bg-gray-500/10 text-gray-700 dark:text-gray-400";

interface PodTableProps {
  pods: PodInfo[];
  onSelect: (pod: PodInfo) => void;
}

export function PodTable({ pods, onSelect }: PodTableProps) {
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());

  const uniqueStatuses = useMemo(
    () => [...new Set(pods.map((p) => p.status))].sort(),
    [pods]
  );

  const filtered = useMemo(() => {
    if (statusFilter.size === 0) return pods;
    return pods.filter((p) => statusFilter.has(p.status));
  }, [pods, statusFilter]);

  function toggleStatus(status: string) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

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
    return (
      <p className="text-muted-foreground py-8 text-center">No pods found.</p>
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
          {filtered.length} of {pods.length} pods
        </span>
        <ExportDropdown data={filtered} columns={exportColumns} filename="pods" />
      </div>

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className="rounded-md border min-w-[600px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Namespace</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ready</TableHead>
              <TableHead>Restarts</TableHead>
              <TableHead>Age</TableHead>
              <TableHead className="hidden md:table-cell">Node</TableHead>
              <TableHead className="hidden md:table-cell">IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-muted-foreground py-8 text-center"
                >
                  No pods match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((pod, i) => (
                <motion.tr
                  key={`${pod.namespace}/${pod.name}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.03, ease }}
                  className="border-b cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => onSelect(pod)}
                >
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {pod.name}
                  </TableCell>
                  <TableCell>{pod.namespace}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusColors[pod.status] || defaultStatusColor}
                    >
                      {pod.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{pod.ready}</TableCell>
                  <TableCell>
                    {pod.restarts > 0 ? (
                      <span className={pod.restarts > 5 ? "text-red-500" : ""}>
                        {pod.restarts}
                      </span>
                    ) : (
                      "0"
                    )}
                  </TableCell>
                  <TableCell>{pod.age}</TableCell>
                  <TableCell className="hidden md:table-cell max-w-[140px] truncate">
                    {pod.node}
                  </TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-sm">{pod.ip}</TableCell>
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

"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusDot } from "@/components/cluster-status-badge";
import { NodeResourceCircles } from "@/components/node-resource-circles";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NodeActionsDropdown } from "@/components/node-actions-dropdown";
import { ExportDropdown } from "@/components/export-dropdown";
import type { NodeInfo, NodeMetricsInfo } from "@/lib/types";
import type { ExportColumn } from "@/lib/export";
import { formatCpuMillicores, formatBytes } from "@/lib/format";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

function UsageBar({ percent }: { percent: number }) {
  const color =
    percent >= 85
      ? "bg-red-500"
      : percent >= 70
        ? "bg-yellow-500"
        : "bg-emerald-500";

  return (
    <div className="flex items-center gap-2">
      <div className="bg-secondary h-2 w-16 overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <span className="text-xs tabular-nums">{percent.toFixed(0)}%</span>
    </div>
  );
}

interface NodeTableProps {
  nodes: NodeInfo[];
  metrics?: NodeMetricsInfo[];
  clusterId?: string;
  onRefresh?: () => void;
}

export function NodeTable({ nodes, metrics, clusterId, onRefresh }: NodeTableProps) {
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [roleFilter, setRoleFilter] = useState<Set<string>>(new Set());

  const metricsMap = useMemo(() => {
    const map = new Map<string, NodeMetricsInfo>();
    if (metrics) {
      for (const m of metrics) map.set(m.name, m);
    }
    return map;
  }, [metrics]);

  const hasMetrics = metrics && metrics.length > 0;

  const uniqueStatuses = useMemo(
    () => [...new Set(nodes.map((n) => n.status))],
    [nodes]
  );

  const uniqueRoles = useMemo(
    () => [...new Set(nodes.flatMap((n) => n.roles))],
    [nodes]
  );

  const filtered = useMemo(() => {
    return nodes.filter((node) => {
      if (statusFilter.size > 0 && !statusFilter.has(node.status)) return false;
      if (roleFilter.size > 0 && !node.roles.some((r) => roleFilter.has(r)))
        return false;
      return true;
    });
  }, [nodes, statusFilter, roleFilter]);

  const hasFilters = statusFilter.size > 0 || roleFilter.size > 0;

  function toggleStatus(status: string) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function toggleRole(role: string) {
    setRoleFilter((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  }

  function clearFilters() {
    setStatusFilter(new Set());
    setRoleFilter(new Set());
  }

  const exportColumns: ExportColumn<NodeInfo>[] = useMemo(
    () => [
      { key: "name", header: "Name" },
      { key: "status", header: "Status" },
      { key: "roles", header: "Roles", transform: (r) => r.roles.join(", ") },
      { key: "age", header: "Age" },
      { key: "version", header: "Version" },
      { key: "os", header: "OS" },
      { key: "arch", header: "Arch" },
      { key: "cpu", header: "CPU" },
      { key: "memory", header: "Memory" },
      { key: "internalIP", header: "Internal IP" },
      { key: "schedulable", header: "Schedulable", transform: (r) => String(r.schedulable) },
    ],
    []
  );

  if (nodes.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center">No nodes found.</p>
    );
  }

  return (
    <div className="space-y-4">
      {metrics && <NodeResourceCircles metrics={metrics} />}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {uniqueStatuses.map((status) => (
            <Button
              key={status}
              variant={statusFilter.has(status) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleStatus(status)}
            >
              <StatusDot connected={status === "Ready"} />
              {status}
            </Button>
          ))}

          {uniqueRoles.length > 0 && (
            <>
              <Separator orientation="vertical" className="mx-1 h-6" />
              {uniqueRoles.map((role) => (
                <Button
                  key={role}
                  variant={roleFilter.has(role) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleRole(role)}
                >
                  {role}
                </Button>
              ))}
            </>
          )}

          {hasFilters && (
            <>
              <Separator orientation="vertical" className="mx-1 h-6" />
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 size-3" />
                Clear filters
              </Button>
            </>
          )}

          <span className="text-muted-foreground ml-auto text-sm">
            {filtered.length} of {nodes.length} nodes
          </span>
          <ExportDropdown data={filtered} columns={exportColumns} filename="nodes" />
        </div>

        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <div className="rounded-md border min-w-[700px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Age</TableHead>
                <TableHead className="hidden md:table-cell">Version</TableHead>
                <TableHead className="hidden lg:table-cell">OS</TableHead>
                <TableHead className="hidden lg:table-cell">Arch</TableHead>
                <TableHead>CPU</TableHead>
                <TableHead>Memory</TableHead>
                {hasMetrics && <TableHead>CPU Usage</TableHead>}
                {hasMetrics && <TableHead>Mem Usage</TableHead>}
                <TableHead className="hidden md:table-cell">Internal IP</TableHead>
                {clusterId && <TableHead className="w-10">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={(hasMetrics ? 12 : 10) + (clusterId ? 1 : 0)} className="text-muted-foreground py-8 text-center">
                    No nodes match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((node, i) => {
                  const m = metricsMap.get(node.name);
                  return (
                    <motion.tr
                      key={node.name}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.04, ease }}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
                      <TableCell className="font-medium">{node.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={
                              node.status === "Ready"
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
                            }
                          >
                            <StatusDot connected={node.status === "Ready"} />
                            {node.status}
                          </Badge>
                          {!node.schedulable && (
                            <Badge
                              variant="outline"
                              className="border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                            >
                              Cordoned
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {node.roles.map((role) => (
                            <Badge key={role} variant="secondary">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{node.age}</TableCell>
                      <TableCell className="hidden md:table-cell">{node.version}</TableCell>
                      <TableCell className="hidden lg:table-cell">{node.os}</TableCell>
                      <TableCell className="hidden lg:table-cell">{node.arch}</TableCell>
                      <TableCell>{node.cpu}</TableCell>
                      <TableCell>{node.memory}</TableCell>
                      {hasMetrics && (
                        <TableCell>
                          {m ? (
                            <div className="space-y-0.5">
                              <UsageBar percent={m.cpuPercent} />
                              <span className="text-muted-foreground text-xs">
                                {formatCpuMillicores(m.cpuUsage)}/{formatCpuMillicores(m.cpuCapacity)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">N/A</span>
                          )}
                        </TableCell>
                      )}
                      {hasMetrics && (
                        <TableCell>
                          {m ? (
                            <div className="space-y-0.5">
                              <UsageBar percent={m.memoryPercent} />
                              <span className="text-muted-foreground text-xs">
                                {formatBytes(m.memoryUsage)}/{formatBytes(m.memoryCapacity)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">N/A</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="hidden md:table-cell font-mono text-sm">
                        {node.internalIP}
                      </TableCell>
                      {clusterId && onRefresh && (
                        <TableCell>
                          <NodeActionsDropdown
                            node={node}
                            clusterId={clusterId}
                            onRefresh={onRefresh}
                          />
                        </TableCell>
                      )}
                    </motion.tr>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        </div>
      </div>
    </div>
  );
}

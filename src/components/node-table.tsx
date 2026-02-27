"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Cpu, MemoryStick } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusDot } from "@/components/cluster-status-badge";
import { NodeActionsDropdown } from "@/components/node-actions-dropdown";
import { ExportDropdown } from "@/components/export-dropdown";
import { PodTable } from "@/components/pod-table";
import type { NodeInfo, NodeMetricsInfo, PodInfo } from "@/lib/types";
import type { ExportColumn } from "@/lib/export";
import { formatCpuMillicores, formatBytes } from "@/lib/format";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

function MiniBar({ percent }: { percent: number }) {
  const color =
    percent >= 85 ? "bg-red-500" : percent >= 70 ? "bg-yellow-500" : "bg-emerald-500";
  return (
    <div className="bg-secondary h-1.5 flex-1 overflow-hidden rounded-full">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

function UsageBar({ percent }: { percent: number }) {
  const color =
    percent >= 85 ? "bg-red-500" : percent >= 70 ? "bg-yellow-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="bg-secondary h-2 flex-1 overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs tabular-nums">{percent.toFixed(0)}%</span>
    </div>
  );
}

interface NodeCardProps {
  node: NodeInfo;
  metrics?: NodeMetricsInfo;
  selected: boolean;
  onClick: () => void;
  index: number;
}

function NodeCard({ node, metrics, selected, onClick, index }: NodeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.24), ease }}
    >
      <button
        onClick={onClick}
        className={`w-full rounded-lg border p-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          selected
            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
            : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
        }`}
      >
        {/* Name + status */}
        <div className="mb-2 flex items-start justify-between gap-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <StatusDot connected={node.status === "Ready"} />
            <span className="truncate text-sm font-medium">{node.name}</span>
          </div>
          {!node.schedulable && (
            <Badge
              variant="outline"
              className="shrink-0 border-yellow-500/30 bg-yellow-500/10 text-xs text-yellow-700 dark:text-yellow-400"
            >
              Cordoned
            </Badge>
          )}
        </div>

        {/* Roles */}
        <div className="mb-2 flex flex-wrap gap-1">
          {node.roles.map((role) => (
            <Badge key={role} variant="secondary" className="px-1.5 py-0 text-xs">
              {role}
            </Badge>
          ))}
        </div>

        {/* IP + capacity */}
        <p className="mb-1.5 font-mono text-xs text-muted-foreground">{node.internalIP}</p>
        <p className="mb-2 text-xs text-muted-foreground">
          {node.cpu} CPU · {node.memory}
        </p>

        {/* Mini metrics */}
        {metrics && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Cpu className="size-3 shrink-0 text-muted-foreground" />
              <MiniBar percent={metrics.cpuPercent} />
              <span className="w-7 text-right text-xs tabular-nums text-muted-foreground">
                {metrics.cpuPercent.toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <MemoryStick className="size-3 shrink-0 text-muted-foreground" />
              <MiniBar percent={metrics.memoryPercent} />
              <span className="w-7 text-right text-xs tabular-nums text-muted-foreground">
                {metrics.memoryPercent.toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </button>
    </motion.div>
  );
}

interface NodeDetailCardProps {
  node: NodeInfo;
  metrics?: NodeMetricsInfo;
  clusterId?: string;
  onRefresh?: () => void;
  onClose: () => void;
}

function NodeDetailCard({ node, metrics, clusterId, onRefresh, onClose }: NodeDetailCardProps) {
  return (
    <Card className="border-primary/25">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusDot connected={node.status === "Ready"} />
            <CardTitle className="text-base">{node.name}</CardTitle>
            <Badge
              variant="outline"
              className={
                node.status === "Ready"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
              }
            >
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
          <div className="flex items-center gap-1">
            {clusterId && onRefresh && (
              <NodeActionsDropdown node={node} clusterId={clusterId} onRefresh={onRefresh} />
            )}
            <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <p className="mb-0.5 text-xs text-muted-foreground">Roles</p>
            <div className="flex flex-wrap gap-1">
              {node.roles.map((r) => (
                <Badge key={r} variant="secondary" className="text-xs">
                  {r}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-0.5 text-xs text-muted-foreground">Age</p>
            <p className="font-medium">{node.age}</p>
          </div>
          <div>
            <p className="mb-0.5 text-xs text-muted-foreground">Version</p>
            <p className="font-mono text-xs font-medium">{node.version}</p>
          </div>
          <div>
            <p className="mb-0.5 text-xs text-muted-foreground">Internal IP</p>
            <p className="font-mono text-xs font-medium">{node.internalIP}</p>
          </div>
          <div>
            <p className="mb-0.5 text-xs text-muted-foreground">OS</p>
            <p className="font-medium">{node.os}</p>
          </div>
          <div>
            <p className="mb-0.5 text-xs text-muted-foreground">Architecture</p>
            <p className="font-medium">{node.arch}</p>
          </div>
          <div>
            <p className="mb-0.5 text-xs text-muted-foreground">CPU</p>
            <p className="font-medium">{node.cpu}</p>
          </div>
          <div>
            <p className="mb-0.5 text-xs text-muted-foreground">Memory</p>
            <p className="font-medium">{node.memory}</p>
          </div>
        </div>

        {metrics && (
          <>
            <Separator />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Cpu className="size-3" /> CPU Usage
                  </span>
                  <span className="text-muted-foreground">
                    {formatCpuMillicores(metrics.cpuUsage)} / {formatCpuMillicores(metrics.cpuCapacity)}
                  </span>
                </div>
                <UsageBar percent={metrics.cpuPercent} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MemoryStick className="size-3" /> Memory Usage
                  </span>
                  <span className="text-muted-foreground">
                    {formatBytes(metrics.memoryUsage)} / {formatBytes(metrics.memoryCapacity)}
                  </span>
                </div>
                <UsageBar percent={metrics.memoryPercent} />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface NodeTableProps {
  nodes: NodeInfo[];
  metrics?: NodeMetricsInfo[];
  pods?: PodInfo[];
  clusterId?: string;
  onRefresh?: () => void;
  onSelectPod?: (pod: PodInfo) => void;
}

export function NodeTable({
  nodes,
  metrics,
  pods = [],
  clusterId,
  onRefresh,
  onSelectPod,
}: NodeTableProps) {
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [roleFilter, setRoleFilter] = useState<Set<string>>(new Set());

  const metricsMap = useMemo(() => {
    const map = new Map<string, NodeMetricsInfo>();
    if (metrics) {
      for (const m of metrics) map.set(m.name, m);
    }
    return map;
  }, [metrics]);

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
      if (roleFilter.size > 0 && !node.roles.some((r) => roleFilter.has(r))) return false;
      return true;
    });
  }, [nodes, statusFilter, roleFilter]);

  const hasFilters = statusFilter.size > 0 || roleFilter.size > 0;

  const nodePods = useMemo(
    () => pods.filter((p) => p.node === selectedNode?.name),
    [pods, selectedNode]
  );

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

  function handleNodeClick(node: NodeInfo) {
    setSelectedNode((prev) => (prev?.name === node.name ? null : node));
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
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold">Nodes</h2>
        <p className="text-sm text-muted-foreground">Physical and virtual machines in this cluster</p>
      </div>

      {/* Selected node detail panel — rendered at the top */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            key={selectedNode.name}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease }}
            className="space-y-4"
          >
            <NodeDetailCard
              node={selectedNode}
              metrics={metricsMap.get(selectedNode.name)}
              clusterId={clusterId}
              onRefresh={onRefresh}
              onClose={() => setSelectedNode(null)}
            />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">
                  Pods on{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {selectedNode.name}
                  </code>
                </h3>
                <Badge variant="secondary">{nodePods.length}</Badge>
              </div>
              {nodePods.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No pods on this node.
                </p>
              ) : (
                <PodTable pods={nodePods} onSelect={onSelectPod ?? (() => {})} />
              )}
            </div>

            <Separator />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter pills */}
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

        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} of {nodes.length} nodes
        </span>
        <ExportDropdown data={filtered} columns={exportColumns} filename="nodes" />
      </div>

      {/* Node cards grid */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No nodes match the current filters.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((node, i) => (
            <NodeCard
              key={node.name}
              node={node}
              metrics={metricsMap.get(node.name)}
              selected={selectedNode?.name === node.name}
              onClick={() => handleNodeClick(node)}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import {
  Search,
  X,
  Globe,
  Network,
  Server,
  Link2,
  HelpCircle,
  FolderOpen,
  ChevronRight,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ExportDropdown } from "@/components/export-dropdown";
import { cn } from "@/lib/utils";
import type { ExportColumn } from "@/lib/export";
import type { ServiceInfo } from "@/lib/types";

// ─── Type config ──────────────────────────────────────────────────────────────

type SvcType = "ClusterIP" | "NodePort" | "LoadBalancer" | "ExternalName";

const TYPE_CFG: Record<string, { icon: React.ElementType; badge: string }> = {
  ClusterIP:    { icon: Network,  badge: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  NodePort:     { icon: Server,   badge: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400" },
  LoadBalancer: { icon: Globe,    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  ExternalName: { icon: Link2,    badge: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400" },
};

const DEFAULT_CFG = { icon: HelpCircle, badge: "" };

// ─── Service row ──────────────────────────────────────────────────────────────

function ServiceRow({ svc, onSelect }: { svc: ServiceInfo; onSelect: (s: ServiceInfo) => void }) {
  const { icon: Icon, badge } = TYPE_CFG[svc.type] ?? DEFAULT_CFG;
  const hasExternal = svc.externalIP && svc.externalIP !== "<none>" && svc.externalIP !== "None";

  return (
    <div
      className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40 cursor-pointer"
      onClick={() => onSelect(svc)}
    >
      {/* Type icon */}
      <Icon className="size-4 shrink-0 text-muted-foreground" />

      {/* Name */}
      <div className="min-w-0 flex-1">
        <span className="block truncate font-mono text-sm font-medium">{svc.name}</span>
        {hasExternal && (
          <span className="font-mono text-[11px] text-muted-foreground">{svc.externalIP}</span>
        )}
      </div>

      {/* Right-side metadata */}
      <div className="flex shrink-0 items-center gap-2.5 text-[11px] text-muted-foreground">
        <Badge variant="outline" className={cn("text-xs", badge)}>
          {svc.type}
        </Badge>

        {svc.ports && (
          <span className="hidden font-mono sm:inline">{svc.ports}</span>
        )}

        <span className="hidden items-center gap-0.5 sm:flex">
          <Clock className="size-3" />
          {svc.age}
        </span>

        <ChevronRight className="size-3.5 opacity-40" />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ServiceTableProps {
  services: ServiceInfo[];
  onSelect: (service: ServiceInfo) => void;
}

export function ServiceTable({ services, onSelect }: ServiceTableProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());

  const uniqueTypes = useMemo(
    () => [...new Set(services.map((s) => s.type))].sort(),
    [services]
  );

  const filtered = useMemo(() => {
    let result = services;
    if (typeFilter.size > 0) result = result.filter((s) => typeFilter.has(s.type));
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) => s.name.toLowerCase().includes(q) || s.namespace.toLowerCase().includes(q)
      );
    }
    return result;
  }, [services, typeFilter, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, ServiceInfo[]> = {};
    for (const svc of filtered) {
      if (!groups[svc.namespace]) groups[svc.namespace] = [];
      groups[svc.namespace].push(svc);
    }
    return groups;
  }, [filtered]);

  const sortedNamespaces = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  function toggleType(type: string) {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const hasFilters = typeFilter.size > 0 || search.trim() !== "";

  const lbCount = useMemo(
    () => services.filter((s) => s.type === "LoadBalancer").length,
    [services]
  );

  const exportColumns: ExportColumn<ServiceInfo>[] = useMemo(
    () => [
      { key: "name",       header: "Name" },
      { key: "namespace",  header: "Namespace" },
      { key: "type",       header: "Type" },
      { key: "clusterIP",  header: "Cluster IP" },
      { key: "externalIP", header: "External IP" },
      { key: "ports",      header: "Ports" },
      { key: "age",        header: "Age" },
    ],
    []
  );

  if (services.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">No services found.</p>;
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-medium">{services.length} services</span>
        {lbCount > 0 && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <span className="text-emerald-600 dark:text-emerald-400">{lbCount} load balancer{lbCount !== 1 ? "s" : ""}</span>
          </>
        )}
      </div>

      {/* Search + type filters */}
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

        {uniqueTypes.length > 1 && (
          <div className="flex gap-1">
            {uniqueTypes.map((type) => (
              <Button
                key={type}
                variant={typeFilter.has(type) ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => toggleType(type)}
              >
                {type}
              </Button>
            ))}
          </div>
        )}

        {hasFilters && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => { setSearch(""); setTypeFilter(new Set()); }}
            >
              <X className="mr-1 size-3" />
              Clear
            </Button>
          </>
        )}

        <div className="ml-auto">
          <ExportDropdown data={filtered} columns={exportColumns} filename="services" />
        </div>
      </div>

      {/* Namespace-grouped list */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No services match the current filters.
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
                {grouped[ns].map((svc) => (
                  <ServiceRow
                    key={`${svc.namespace}/${svc.name}`}
                    svc={svc}
                    onSelect={onSelect}
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

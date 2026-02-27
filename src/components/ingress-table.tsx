"use client";

import { useState, useMemo } from "react";
import {
  Search,
  X,
  Globe,
  ExternalLink,
  FolderOpen,
  ChevronRight,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExportDropdown } from "@/components/export-dropdown";
import type { ExportColumn } from "@/lib/export";
import type { IngressInfo } from "@/lib/types";

// ─── Hosts cell ───────────────────────────────────────────────────────────────

function HostLinks({ hosts }: { hosts: string }) {
  if (!hosts || hosts === "*") {
    return <span className="font-mono text-[11px] text-muted-foreground">*</span>;
  }

  const hostList = hosts
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      {hostList.map((host) => {
        const url =
          host.startsWith("http://") || host.startsWith("https://")
            ? host
            : `https://${host}`;
        return (
          <span key={host} className="flex items-center gap-0.5">
            <span className="max-w-[180px] truncate font-mono text-[11px]">{host}</span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
              title={`Open ${url}`}
            >
              <ExternalLink className="size-3" />
            </a>
          </span>
        );
      })}
    </div>
  );
}

// ─── Ingress row ──────────────────────────────────────────────────────────────

function IngressRow({
  ing,
  onSelect,
}: {
  ing: IngressInfo;
  onSelect: (i: IngressInfo) => void;
}) {
  const hasAddress = ing.addresses && ing.addresses !== "<none>";

  return (
    <div
      className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40 cursor-pointer"
      onClick={() => onSelect(ing)}
    >
      {/* Icon */}
      <Globe className="size-4 shrink-0 text-muted-foreground" />

      {/* Name + hosts */}
      <div className="min-w-0 flex-1">
        <span className="block truncate font-mono text-sm font-medium">{ing.name}</span>
        <HostLinks hosts={ing.hosts} />
      </div>

      {/* Right-side metadata */}
      <div
        className="flex shrink-0 items-center gap-2.5 text-[11px] text-muted-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {hasAddress && (
          <span className="hidden font-mono sm:inline">{ing.addresses}</span>
        )}

        {ing.ingressClass && (
          <Badge variant="secondary" className="text-xs">
            {ing.ingressClass}
          </Badge>
        )}

        <span className="hidden items-center gap-0.5 sm:flex">
          <Clock className="size-3" />
          {ing.age}
        </span>

        <ChevronRight className="size-3.5 opacity-40" />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface IngressTableProps {
  ingresses: IngressInfo[];
  onSelect: (ingress: IngressInfo) => void;
}

export function IngressTable({ ingresses, onSelect }: IngressTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return ingresses;
    const q = search.toLowerCase();
    return ingresses.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.namespace.toLowerCase().includes(q) ||
        i.hosts.toLowerCase().includes(q)
    );
  }, [ingresses, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, IngressInfo[]> = {};
    for (const ing of filtered) {
      if (!groups[ing.namespace]) groups[ing.namespace] = [];
      groups[ing.namespace].push(ing);
    }
    return groups;
  }, [filtered]);

  const sortedNamespaces = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  const exportColumns: ExportColumn<IngressInfo>[] = useMemo(
    () => [
      { key: "name",         header: "Name" },
      { key: "namespace",    header: "Namespace" },
      { key: "hosts",        header: "Hosts" },
      { key: "addresses",    header: "Addresses" },
      { key: "ports",        header: "Ports" },
      { key: "ingressClass", header: "Class" },
      { key: "age",          header: "Age" },
    ],
    []
  );

  if (ingresses.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No ingresses found.</p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search + count */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, namespace, or host…"
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

        <span className="shrink-0 text-sm text-muted-foreground">
          {filtered.length} of {ingresses.length}
        </span>
        <ExportDropdown data={filtered} columns={exportColumns} filename="ingresses" />
      </div>

      {/* Namespace-grouped list */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No ingresses match the search.
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
                {grouped[ns].map((ing) => (
                  <IngressRow
                    key={`${ing.namespace}/${ing.name}`}
                    ing={ing}
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

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
import type { ServiceInfo } from "@/lib/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const typeColors: Record<string, string> = {
  ClusterIP:
    "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  NodePort:
    "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400",
  LoadBalancer:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  ExternalName:
    "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400",
};

interface ServiceTableProps {
  services: ServiceInfo[];
  onSelect: (service: ServiceInfo) => void;
}

export function ServiceTable({ services, onSelect }: ServiceTableProps) {
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());

  const uniqueTypes = useMemo(
    () => [...new Set(services.map((s) => s.type))].sort(),
    [services]
  );

  const filtered = useMemo(() => {
    if (typeFilter.size === 0) return services;
    return services.filter((s) => typeFilter.has(s.type));
  }, [services, typeFilter]);

  function toggleType(type: string) {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const exportColumns: ExportColumn<ServiceInfo>[] = useMemo(
    () => [
      { key: "name", header: "Name" },
      { key: "namespace", header: "Namespace" },
      { key: "type", header: "Type" },
      { key: "clusterIP", header: "Cluster IP" },
      { key: "externalIP", header: "External IP" },
      { key: "ports", header: "Ports" },
      { key: "age", header: "Age" },
    ],
    []
  );

  if (services.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        No services found.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {uniqueTypes.map((type) => (
          <Button
            key={type}
            variant={typeFilter.has(type) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleType(type)}
          >
            {type}
          </Button>
        ))}

        {typeFilter.size > 0 && (
          <>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTypeFilter(new Set())}
            >
              <X className="mr-1 size-3" />
              Clear filters
            </Button>
          </>
        )}

        <span className="text-muted-foreground ml-auto text-sm">
          {filtered.length} of {services.length} services
        </span>
        <ExportDropdown data={filtered} columns={exportColumns} filename="services" />
      </div>

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className="rounded-md border min-w-[550px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Namespace</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Cluster IP</TableHead>
              <TableHead className="hidden md:table-cell">External IP</TableHead>
              <TableHead>Ports</TableHead>
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
                  No services match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((svc, i) => (
                <motion.tr
                  key={`${svc.namespace}/${svc.name}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.03, ease }}
                  className="border-b cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => onSelect(svc)}
                >
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {svc.name}
                  </TableCell>
                  <TableCell>{svc.namespace}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={typeColors[svc.type] || ""}
                    >
                      {svc.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {svc.clusterIP}
                  </TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-sm max-w-[160px] truncate">
                    {svc.externalIP}
                  </TableCell>
                  <TableCell className="font-mono text-sm max-w-[160px] truncate">
                    {svc.ports}
                  </TableCell>
                  <TableCell>{svc.age}</TableCell>
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

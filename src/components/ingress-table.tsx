"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
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
import type { IngressInfo } from "@/lib/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface IngressTableProps {
  ingresses: IngressInfo[];
  onSelect: (ingress: IngressInfo) => void;
}

export function IngressTable({ ingresses, onSelect }: IngressTableProps) {
  const sorted = useMemo(
    () => [...ingresses].sort((a, b) => a.name.localeCompare(b.name)),
    [ingresses]
  );

  const exportColumns: ExportColumn<IngressInfo>[] = useMemo(
    () => [
      { key: "name", header: "Name" },
      { key: "namespace", header: "Namespace" },
      { key: "hosts", header: "Hosts" },
      { key: "addresses", header: "Addresses" },
      { key: "ports", header: "Ports" },
      { key: "ingressClass", header: "Class" },
      { key: "age", header: "Age" },
    ],
    []
  );

  if (ingresses.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        No ingresses found.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground ml-auto text-sm">
          {ingresses.length} ingress{ingresses.length !== 1 ? "es" : ""}
        </span>
        <ExportDropdown data={sorted} columns={exportColumns} filename="ingresses" />
      </div>

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className="rounded-md border min-w-[550px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Namespace</TableHead>
              <TableHead>Hosts</TableHead>
              <TableHead className="hidden md:table-cell">Addresses</TableHead>
              <TableHead>Ports</TableHead>
              <TableHead className="hidden md:table-cell">Class</TableHead>
              <TableHead>Age</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((ing, i) => (
              <motion.tr
                key={`${ing.namespace}/${ing.name}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03, ease }}
                className="border-b cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => onSelect(ing)}
              >
                <TableCell className="font-medium max-w-[200px] truncate">
                  {ing.name}
                </TableCell>
                <TableCell>{ing.namespace}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {ing.hosts}
                </TableCell>
                <TableCell className="hidden md:table-cell font-mono text-sm max-w-[140px] truncate">
                  {ing.addresses}
                </TableCell>
                <TableCell>{ing.ports}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {ing.ingressClass && (
                    <Badge variant="secondary">{ing.ingressClass}</Badge>
                  )}
                </TableCell>
                <TableCell>{ing.age}</TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>
      </div>
    </div>
  );
}

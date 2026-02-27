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
import type { ConfigMapInfo } from "@/lib/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface ConfigMapTableProps {
  configMaps: ConfigMapInfo[];
  onSelect: (cm: ConfigMapInfo) => void;
}

export function ConfigMapTable({ configMaps, onSelect }: ConfigMapTableProps) {
  const exportColumns: ExportColumn<ConfigMapInfo>[] = useMemo(
    () => [
      { key: "name", header: "Name" },
      { key: "namespace", header: "Namespace" },
      { key: "keyCount", header: "Keys" },
      { key: "age", header: "Age" },
    ],
    []
  );

  if (configMaps.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        No config maps found.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground ml-auto text-sm">
          {configMaps.length} config map{configMaps.length !== 1 ? "s" : ""}
        </span>
        <ExportDropdown data={configMaps} columns={exportColumns} filename="configmaps" />
      </div>

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="rounded-md border min-w-[450px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Namespace</TableHead>
                <TableHead>Keys</TableHead>
                <TableHead>Age</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configMaps.map((cm, i) => (
                <motion.tr
                  key={`${cm.namespace}/${cm.name}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.03, ease }}
                  className="border-b cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => onSelect(cm)}
                >
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {cm.name}
                  </TableCell>
                  <TableCell>{cm.namespace}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{cm.keyCount}</Badge>
                  </TableCell>
                  <TableCell>{cm.age}</TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

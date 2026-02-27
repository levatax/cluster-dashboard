"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { Check, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StorageClassInfo } from "@/lib/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface StorageClassTableProps {
  storageClasses: StorageClassInfo[];
}

export function StorageClassTable({ storageClasses }: StorageClassTableProps) {
  const sorted = useMemo(
    () => [...storageClasses].sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return a.name.localeCompare(b.name);
    }),
    [storageClasses]
  );

  if (storageClasses.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        No storage classes found.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center">
        <span className="text-muted-foreground ml-auto text-sm">
          {storageClasses.length} storage class{storageClasses.length !== 1 ? "es" : ""}
        </span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Provisioner</TableHead>
              <TableHead>Reclaim Policy</TableHead>
              <TableHead>Binding Mode</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Expansion</TableHead>
              <TableHead>Age</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((sc, i) => (
              <motion.tr
                key={sc.name}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03, ease }}
                className="border-b transition-colors hover:bg-muted/50"
              >
                <TableCell className="font-medium max-w-[200px] truncate">
                  {sc.name}
                </TableCell>
                <TableCell className="font-mono text-sm max-w-[240px] truncate">
                  {sc.provisioner}
                </TableCell>
                <TableCell>{sc.reclaimPolicy}</TableCell>
                <TableCell>{sc.volumeBindingMode}</TableCell>
                <TableCell>
                  {sc.isDefault ? (
                    <Badge
                      variant="outline"
                      className="border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                    >
                      Default
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {sc.allowVolumeExpansion ? (
                    <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Minus className="size-4 text-muted-foreground" />
                  )}
                </TableCell>
                <TableCell>{sc.age}</TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

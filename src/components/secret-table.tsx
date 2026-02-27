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
import type { SecretInfo } from "@/lib/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const typeColors: Record<string, string> = {
  Opaque:
    "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  "kubernetes.io/tls":
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  "kubernetes.io/dockerconfigjson":
    "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400",
  "kubernetes.io/service-account-token":
    "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  "kubernetes.io/basic-auth":
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

interface SecretTableProps {
  secrets: SecretInfo[];
  onSelect: (secret: SecretInfo) => void;
}

export function SecretTable({ secrets, onSelect }: SecretTableProps) {
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());

  const uniqueTypes = useMemo(
    () => [...new Set(secrets.map((s) => s.type))].sort(),
    [secrets]
  );

  const filtered = useMemo(() => {
    if (typeFilter.size === 0) return secrets;
    return secrets.filter((s) => typeFilter.has(s.type));
  }, [secrets, typeFilter]);

  function toggleType(type: string) {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const exportColumns: ExportColumn<SecretInfo>[] = useMemo(
    () => [
      { key: "name", header: "Name" },
      { key: "namespace", header: "Namespace" },
      { key: "type", header: "Type" },
      { key: "keyCount", header: "Keys" },
      { key: "age", header: "Age" },
    ],
    []
  );

  if (secrets.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        No secrets found.
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
          {filtered.length} of {secrets.length} secrets
        </span>
        <ExportDropdown data={filtered} columns={exportColumns} filename="secrets" />
      </div>

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="rounded-md border min-w-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Namespace</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Keys</TableHead>
                <TableHead>Age</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No secrets match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((secret, i) => (
                  <motion.tr
                    key={`${secret.namespace}/${secret.name}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.03, ease }}
                    className="border-b cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => onSelect(secret)}
                  >
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {secret.name}
                    </TableCell>
                    <TableCell>{secret.namespace}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={typeColors[secret.type] || ""}
                      >
                        {secret.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{secret.keyCount}</Badge>
                    </TableCell>
                    <TableCell>{secret.age}</TableCell>
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

"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AppStatusBadge } from "@/components/app-store/app-status-badge";
import { fetchDeploymentHistory } from "@/app/actions/deploy-history";
import type { DeploymentHistoryRow } from "@/lib/db";

interface DeployHistoryTableProps {
  clusterId: string;
}

const SOURCE_LABELS: Record<string, string> = {
  catalog: "App Store",
  github: "GitHub",
  template: "Template",
};

const ACTION_LABELS: Record<string, string> = {
  install: "Install",
  uninstall: "Uninstall",
  deploy: "Deploy",
  delete: "Delete",
  create: "Create",
  redeploy: "Redeploy",
};

export function DeployHistoryTable({ clusterId }: DeployHistoryTableProps) {
  const [history, setHistory] = useState<DeploymentHistoryRow[]>([]);

  useEffect(() => {
    fetchDeploymentHistory(clusterId).then((r) => {
      if (r.success) setHistory(r.data);
    });
  }, [clusterId]);

  if (history.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No deployment history yet. Install an app, deploy from GitHub, or create a resource template.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Release</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Namespace</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.release_name}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px]">
                  {SOURCE_LABELS[row.source_type] || row.source_type}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {ACTION_LABELS[row.action] || row.action}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {row.namespace}
              </TableCell>
              <TableCell>
                <AppStatusBadge status={row.status} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(row.created_at).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

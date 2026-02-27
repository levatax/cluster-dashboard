"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppStatusBadge } from "./app-status-badge";
import { Trash2, Loader2 } from "lucide-react";
import type { AppInstallRow } from "@/lib/db";

interface InstalledAppsListProps {
  installs: AppInstallRow[];
  catalogNames: Record<string, { name: string; icon: string }>;
  onUninstall: (installId: string) => Promise<void>;
}

export function InstalledAppsList({ installs, catalogNames, onUninstall }: InstalledAppsListProps) {
  const [uninstalling, setUninstalling] = useState<string | null>(null);

  if (installs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No apps installed yet. Browse the catalog to get started.
      </div>
    );
  }

  async function handleUninstall(id: string) {
    setUninstalling(id);
    try {
      await onUninstall(id);
    } finally {
      setUninstalling(null);
    }
  }

  return (
    <div className="grid gap-3">
      {installs.map((install) => {
        const info = catalogNames[install.catalog_app_id];
        return (
          <Card key={install.id}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xl">
                {info?.icon || "📦"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{info?.name || install.catalog_app_id}</span>
                  <AppStatusBadge status={install.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {install.release_name} in {install.namespace} &middot; {install.deploy_method}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleUninstall(install.id)}
                disabled={uninstalling === install.id || install.status === "uninstalling"}
              >
                {uninstalling === install.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

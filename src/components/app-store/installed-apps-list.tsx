"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { AppStatusBadge } from "./app-status-badge";
import { Trash2, Loader2, FolderOpen } from "lucide-react";
import type { AppInstallRow } from "@/lib/db";

interface InstalledAppsListProps {
  installs: AppInstallRow[];
  catalogNames: Record<string, { name: string; icon: string }>;
  onUninstall: (installId: string) => Promise<void>;
}

export function InstalledAppsList({
  installs,
  catalogNames,
  onUninstall,
}: InstalledAppsListProps) {
  const [uninstalling, setUninstalling] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const groups: Record<string, AppInstallRow[]> = {};
    for (const install of installs) {
      const ns = install.namespace || "default";
      if (!groups[ns]) groups[ns] = [];
      groups[ns].push(install);
    }
    return groups;
  }, [installs]);

  const namespaces = useMemo(() => Object.keys(grouped).sort(), [grouped]);

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
    <div className="space-y-4">
      {namespaces.map((ns) => (
        <div key={ns}>
          <div className="flex items-center gap-1.5 mb-2">
            <FolderOpen className="size-3.5 text-muted-foreground" />
            <h3 className="text-sm font-medium font-mono">{ns}</h3>
            <span className="text-xs text-muted-foreground">({grouped[ns].length})</span>
          </div>
          <div className="rounded-lg border divide-y overflow-hidden">
            {grouped[ns].map((install) => {
              const info = catalogNames[install.catalog_app_id];
              return (
                <div key={install.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-base">
                    {info?.icon || "📦"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {info?.name || install.catalog_app_id}
                      </span>
                      <AppStatusBadge status={install.status} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {install.release_name} &middot; {install.deploy_method}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleUninstall(install.id)}
                    disabled={
                      uninstalling === install.id || install.status === "uninstalling"
                    }
                  >
                    {uninstalling === install.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

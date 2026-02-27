"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppCard } from "./app-card";
import { AppDetailDialog } from "./app-detail-dialog";
import { CategoryFilter } from "./category-filter";
import { InstalledAppsList } from "./installed-apps-list";
import { StaggerGrid, StaggerItem } from "@/components/motion-primitives";
import { fetchCatalogApps, fetchInstalledApps, installCatalogApp, uninstallCatalogApp, checkHelmAvailable } from "@/app/actions/app-store";
import { Search } from "lucide-react";
import { toast } from "sonner";
import type { CatalogCategory } from "@/lib/catalog/types";
type CatalogAppView = { id: string; name: string; description: string; icon: string; category: CatalogCategory; version: string; versions: string[]; website?: string; configFields: import("@/lib/catalog/types").ConfigField[]; helmChart?: { repo: string; repoUrl: string; chart: string } };
import type { AppInstallRow } from "@/lib/db";

interface AppStorePageProps {
  clusterId: string;
}

export function AppStorePage({ clusterId }: AppStorePageProps) {
  const [apps, setApps] = useState<CatalogAppView[]>([]);
  const [installs, setInstalls] = useState<AppInstallRow[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CatalogCategory | null>(null);
  const [view, setView] = useState<"browse" | "installed">("browse");
  const [selectedApp, setSelectedApp] = useState<CatalogAppView | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [helmAvailable, setHelmAvailable] = useState(false);

  useEffect(() => {
    fetchCatalogApps().then((r) => {
      if (r.success) setApps(r.data);
    });
    fetchInstalledApps(clusterId).then((r) => {
      if (r.success) setInstalls(r.data);
    });
    checkHelmAvailable().then((r) => {
      if (r.success) setHelmAvailable(r.data);
    });
  }, [clusterId]);

  const categories = useMemo(() => {
    return [...new Set(apps.map((a) => a.category))];
  }, [apps]);

  const installedAppIds = useMemo(() => {
    return new Set(installs.filter((i) => i.status !== "uninstalled").map((i) => i.catalog_app_id));
  }, [installs]);

  const catalogNames = useMemo(() => {
    return Object.fromEntries(apps.map((a) => [a.id, { name: a.name, icon: a.icon }]));
  }, [apps]);

  const filtered = useMemo(() => {
    let result = apps;
    if (category) result = result.filter((a) => a.category === category);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [apps, category, search]);

  async function handleInstall(appId: string, config: Record<string, unknown>, deployMethod: "manifest" | "helm") {
    const result = await installCatalogApp(clusterId, appId, config, deployMethod);
    if (result.success) {
      toast.success("App deployed successfully");
      // Refresh installs
      const r = await fetchInstalledApps(clusterId);
      if (r.success) setInstalls(r.data);
    } else {
      toast.error(result.error);
    }
  }

  async function handleUninstall(installId: string) {
    const result = await uninstallCatalogApp(clusterId, installId);
    if (result.success) {
      toast.success("App uninstalled");
      const r = await fetchInstalledApps(clusterId);
      if (r.success) setInstalls(r.data);
    } else {
      toast.error(result.error);
    }
  }

  const activeInstalls = installs.filter((i) => i.status !== "uninstalled");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">App Store</h2>
          <p className="text-sm text-muted-foreground">Browse and install applications</p>
        </div>
        <div className="flex gap-1">
          <Button
            variant={view === "browse" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("browse")}
          >
            Browse
          </Button>
          <Button
            variant={view === "installed" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("installed")}
          >
            Installed ({activeInstalls.length})
          </Button>
        </div>
      </div>

      {view === "browse" ? (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search apps..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category filter */}
          <CategoryFilter
            categories={categories}
            selected={category}
            onSelect={setCategory}
          />

          {/* App grid */}
          {filtered.length > 0 ? (
            <StaggerGrid key={filtered.length} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((app) => (
                <StaggerItem key={app.id}>
                  <AppCard
                    id={app.id}
                    name={app.name}
                    description={app.description}
                    icon={app.icon}
                    category={app.category}
                    version={app.version}
                    installed={installedAppIds.has(app.id)}
                    onInstall={() => {
                      setSelectedApp(app);
                      setDialogOpen(true);
                    }}
                  />
                </StaggerItem>
              ))}
            </StaggerGrid>
          ) : apps.length > 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              No apps found matching your search.
            </p>
          ) : null}
        </>
      ) : (
        <InstalledAppsList
          installs={activeInstalls}
          catalogNames={catalogNames}
          onUninstall={handleUninstall}
        />
      )}

      <AppDetailDialog
        app={selectedApp}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onInstall={handleInstall}
        helmAvailable={helmAvailable}
        clusterId={clusterId}
      />
    </div>
  );
}

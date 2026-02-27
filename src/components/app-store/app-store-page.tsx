"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppCard } from "./app-card";
import { AppDetailDialog } from "./app-detail-dialog";
import { CategoryFilter } from "./category-filter";
import { InstalledAppsList } from "./installed-apps-list";
import {
  fetchCatalogApps,
  fetchInstalledApps,
  installCatalogApp,
  uninstallCatalogApp,
  checkHelmAvailable,
} from "@/app/actions/app-store";
import {
  Search,
  Database,
  Zap,
  Globe,
  Activity,
  MessageSquare,
  HardDrive,
  GitBranch,
  Shield,
  Network,
  FlaskConical,
} from "lucide-react";
import { toast } from "sonner";
import { CATEGORY_LABELS, type CatalogCategory } from "@/lib/catalog/types";
import type { AppInstallRow } from "@/lib/db";

type CatalogAppView = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: CatalogCategory;
  version: string;
  versions: string[];
  website?: string;
  configFields: import("@/lib/catalog/types").ConfigField[];
  helmChart?: { repo: string; repoUrl: string; chart: string };
};

const CATEGORY_ICONS: Record<CatalogCategory, React.ElementType> = {
  databases: Database,
  caching: Zap,
  "web-servers": Globe,
  monitoring: Activity,
  "message-queues": MessageSquare,
  storage: HardDrive,
  "ci-cd": GitBranch,
  security: Shield,
  networking: Network,
};

const CATEGORY_ORDER: CatalogCategory[] = [
  "databases",
  "caching",
  "web-servers",
  "monitoring",
  "message-queues",
  "storage",
  "ci-cd",
  "security",
  "networking",
];

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetchCatalogApps().then((r) => {
        if (r.success) setApps(r.data);
      }),
      fetchInstalledApps(clusterId).then((r) => {
        if (r.success) setInstalls(r.data);
      }),
      checkHelmAvailable().then((r) => {
        if (r.success) setHelmAvailable(r.data);
      }),
    ]).finally(() => setIsLoading(false));
  }, [clusterId]);

  const categories = useMemo(() => {
    return [...new Set(apps.map((a) => a.category))];
  }, [apps]);

  const installedAppIds = useMemo(() => {
    return new Set(
      installs.filter((i) => i.status !== "uninstalled").map((i) => i.catalog_app_id)
    );
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

  const grouped = useMemo(() => {
    const groups: Partial<Record<CatalogCategory, CatalogAppView[]>> = {};
    for (const app of filtered) {
      if (!groups[app.category]) groups[app.category] = [];
      groups[app.category]!.push(app);
    }
    return groups;
  }, [filtered]);

  const groupEntries = useMemo(() => {
    return CATEGORY_ORDER.filter((cat) => (grouped[cat]?.length ?? 0) > 0).map(
      (cat) => [cat, grouped[cat]!] as const
    );
  }, [grouped]);

  async function handleInstall(
    appId: string,
    config: Record<string, unknown>,
    deployMethod: "manifest" | "helm"
  ) {
    const result = await installCatalogApp(clusterId, appId, config, deployMethod);
    if (result.success) {
      toast.success("App deployed successfully");
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
      {/* Beta warning */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
        <FlaskConical className="mt-0.5 size-4 shrink-0" />
        <div>
          <span className="font-medium">Beta feature</span> — The App Store is under active
          development. Some apps may not install correctly, behave unexpectedly, or lack full
          configuration support. We&apos;re continuously improving the catalog and deployment
          reliability.
        </div>
      </div>

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

          {/* App groups */}
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-5 w-32" />
                  <div className="rounded-lg border divide-y overflow-hidden">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <Skeleton key={j} className="h-12 rounded-none" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : groupEntries.length > 0 ? (
            <div className="space-y-4">
              {groupEntries.map(([cat, catApps]) => {
                const Icon = CATEGORY_ICONS[cat];
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Icon className="size-3.5 text-muted-foreground" />
                      <h3 className="text-sm font-medium">{CATEGORY_LABELS[cat]}</h3>
                      <span className="text-xs text-muted-foreground">({catApps.length})</span>
                    </div>
                    <div className="rounded-lg border divide-y overflow-hidden">
                      {catApps.map((app) => (
                        <AppCard
                          key={app.id}
                          id={app.id}
                          name={app.name}
                          description={app.description}
                          icon={app.icon}
                          version={app.version}
                          installed={installedAppIds.has(app.id)}
                          onInstall={() => {
                            setSelectedApp(app);
                            setDialogOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-8">
              No apps found matching your search.
            </p>
          )}
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

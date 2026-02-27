"use client";

import { useState, useMemo } from "react";
import { Search, Layers, HeartPulse, Globe, FolderOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { StaggerGrid } from "@/components/motion-primitives";
import { ApplicationCard } from "@/components/application-card";
import { ApplicationDetailSheet } from "@/components/application-detail-sheet";
import type { DiscoveredApplication } from "@/lib/types";

type HealthFilter = "all" | "Healthy" | "Degraded" | "Progressing";

interface ApplicationsSectionProps {
  applications: DiscoveredApplication[];
  clusterId: string;
  onRefresh: () => void;
}

function StatCard({
  title,
  icon: Icon,
  value,
  subtitle,
}: {
  title: string;
  icon: React.ElementType;
  value: string | number;
  subtitle: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="size-4 text-primary" />
          </div>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export function ApplicationsSection({
  applications,
  clusterId,
  onRefresh,
}: ApplicationsSectionProps) {
  const [search, setSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("all");
  const [showSystem, setShowSystem] = useState(false);
  const [selectedApp, setSelectedApp] = useState<DiscoveredApplication | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    let apps = applications;

    if (!showSystem) {
      const systemNs = new Set(["kube-system", "kube-public", "kube-node-lease"]);
      apps = apps.filter((a) => !systemNs.has(a.namespace));
    }

    if (healthFilter !== "all") {
      apps = apps.filter((a) => a.status === healthFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      apps = apps.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.namespace.toLowerCase().includes(q) ||
          a.hosts.some((h) => h.toLowerCase().includes(q))
      );
    }

    return apps;
  }, [applications, search, healthFilter, showSystem]);

  const healthyCount = applications.filter((a) => a.status === "Healthy").length;
  const namespaces = new Set(applications.map((a) => a.namespace));
  const totalHosts = applications.reduce((sum, a) => sum + a.hosts.length, 0);

  function handleCardClick(app: DiscoveredApplication) {
    setSelectedApp(app);
    setSheetOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Applications"
          icon={Layers}
          value={applications.length}
          subtitle={`${filtered.length} shown`}
        />
        <StatCard
          title="Healthy"
          icon={HeartPulse}
          value={healthyCount}
          subtitle={
            applications.length > 0
              ? `${Math.round((healthyCount / applications.length) * 100)}% healthy`
              : "No apps"
          }
        />
        <StatCard
          title="Namespaces"
          icon={FolderOpen}
          value={namespaces.size}
          subtitle={Array.from(namespaces).slice(0, 3).join(", ") || "—"}
        />
        <StatCard
          title="External Endpoints"
          icon={Globe}
          value={totalHosts}
          subtitle={totalHosts === 1 ? "1 host" : `${totalHosts} hosts`}
        />
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search applications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "Healthy", "Degraded", "Progressing"] as const).map((f) => (
            <Button
              key={f}
              variant={healthFilter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setHealthFilter(f)}
              className="text-xs"
            >
              {f === "all" ? "All" : f}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="show-system"
            checked={showSystem}
            onCheckedChange={setShowSystem}
          />
          <Label htmlFor="show-system" className="text-xs cursor-pointer">
            System
          </Label>
        </div>
      </div>

      {/* App grid */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <Layers className="mx-auto size-10 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            {applications.length === 0
              ? "No applications discovered in this cluster."
              : "No applications match the current filters."}
          </p>
        </div>
      ) : (
        <StaggerGrid className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((app) => (
            <ApplicationCard
              key={`${app.namespace}/${app.name}`}
              app={app}
              onClick={() => handleCardClick(app)}
            />
          ))}
        </StaggerGrid>
      )}

      <ApplicationDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        app={selectedApp}
        clusterId={clusterId}
        onDeleted={onRefresh}
      />
    </div>
  );
}

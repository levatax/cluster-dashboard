"use client";

import { useState, useMemo } from "react";
import { Search, Anchor, CheckCircle2, XCircle, FolderOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { uninstallHelmRelease } from "@/app/actions/kubernetes";
import type { HelmRelease } from "@/lib/helm";

interface HelmReleasesSectionProps {
  releases: HelmRelease[];
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

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "deployed") {
    return <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">deployed</Badge>;
  }
  if (s === "failed") {
    return <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400">failed</Badge>;
  }
  if (s === "pending-install" || s === "pending-upgrade" || s === "pending-rollback") {
    return <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">{s}</Badge>;
  }
  if (s === "superseded" || s === "uninstalled") {
    return <Badge variant="outline" className="border-border text-muted-foreground">{s}</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}

function formatUpdated(updated: string): string {
  try {
    // Helm returns timestamps like "2024-01-15 10:30:00.123456 +0000 UTC"
    const d = new Date(updated.replace(/ \+\d+ \w+$/, "Z").replace(/ /, "T"));
    if (isNaN(d.getTime())) return updated;
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return updated;
  }
}

export function HelmReleasesSection({
  releases,
  clusterId,
  onRefresh,
}: HelmReleasesSectionProps) {
  const [search, setSearch] = useState("");
  const [uninstalling, setUninstalling] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search) return releases;
    const q = search.toLowerCase();
    return releases.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.chart.toLowerCase().includes(q) ||
        r.namespace.toLowerCase().includes(q)
    );
  }, [releases, search]);

  const deployedCount = useMemo(
    () => releases.filter((r) => r.status.toLowerCase() === "deployed").length,
    [releases]
  );

  const failedCount = useMemo(
    () => releases.filter((r) => r.status.toLowerCase() === "failed").length,
    [releases]
  );

  const namespaceCount = useMemo(
    () => new Set(releases.map((r) => r.namespace)).size,
    [releases]
  );

  async function handleUninstall(releaseName: string, namespace: string) {
    setUninstalling(releaseName);
    try {
      const result = await uninstallHelmRelease(clusterId, releaseName, namespace);
      if (result.success) {
        toast.success(`Uninstalled "${releaseName}"`);
        onRefresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to uninstall release");
    } finally {
      setUninstalling(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Total Releases"
          icon={Anchor}
          value={releases.length}
          subtitle={releases.length === 1 ? "1 release" : `${releases.length} releases`}
        />
        <StatCard
          title="Deployed"
          icon={CheckCircle2}
          value={deployedCount}
          subtitle={deployedCount === releases.length ? "All healthy" : `${deployedCount} of ${releases.length}`}
        />
        <StatCard
          title="Failed"
          icon={XCircle}
          value={failedCount}
          subtitle={failedCount === 0 ? "No failures" : `${failedCount} need attention`}
        />
        <StatCard
          title="Namespaces"
          icon={FolderOpen}
          value={namespaceCount}
          subtitle={namespaceCount === 1 ? "1 namespace" : `${namespaceCount} namespaces`}
        />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Filter by name, chart, or namespace..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Anchor className="mb-3 size-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            {releases.length === 0 ? "No Helm releases found" : "No releases match your filter"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            {releases.length === 0
              ? "Install a Helm chart to see it here"
              : "Try a different search term"}
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Namespace</TableHead>
                <TableHead>Chart</TableHead>
                <TableHead>App Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Revision</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[70px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((release) => (
                <TableRow key={`${release.namespace}/${release.name}`}>
                  <TableCell className="font-medium">{release.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {release.namespace}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{release.chart}</TableCell>
                  <TableCell className="font-mono text-xs">{release.app_version || "—"}</TableCell>
                  <TableCell>{statusBadge(release.status)}</TableCell>
                  <TableCell className="text-center tabular-nums">{release.revision}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatUpdated(release.updated)}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          disabled={uninstalling === release.name}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Uninstall &ldquo;{release.name}&rdquo;?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove the Helm release <strong>{release.name}</strong> from
                            namespace <strong>{release.namespace}</strong>. All associated resources
                            will be deleted. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleUninstall(release.name, release.namespace)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Uninstall
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Trash2,
  ExternalLink,
  Globe,
  Clock,
  Cpu,
  Layers,
  Box,
  Network,
  HardDrive,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { DeleteApplicationDialog } from "@/components/delete-application-dialog";
import { cn } from "@/lib/utils";
import type { DiscoveredApplication } from "@/lib/types";

type DetailTab =
  | "overview"
  | "deployments"
  | "services"
  | "ingresses"
  | "storage"
  | "pods";

const STATUS_CONFIG: Record<
  DiscoveredApplication["status"],
  { badge: string; dot: string; bar: string }
> = {
  Healthy: {
    badge: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  Degraded: {
    badge: "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400",
    dot: "bg-red-500 animate-pulse",
    bar: "bg-red-500",
  },
  Progressing: {
    badge: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400",
    dot: "bg-blue-500 animate-pulse",
    bar: "bg-blue-500",
  },
  Unknown: {
    badge: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
    bar: "bg-muted-foreground/40",
  },
};

const POD_STATUS_COLORS: Record<string, string> = {
  Running: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  Pending: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400",
  Succeeded: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  Failed: "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400",
};

interface ApplicationDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: DiscoveredApplication | null;
  clusterId: string;
  onDeleted: () => void;
}

export function ApplicationDetailSheet({
  open,
  onOpenChange,
  app,
  clusterId,
  onDeleted,
}: ApplicationDetailSheetProps) {
  const [tab, setTab] = useState<DetailTab>("overview");
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!app) return null;

  const statusCfg = STATUS_CONFIG[app.status];
  const runningPods = app.pods.filter((p) => p.status === "Running").length;
  const allPodsRunning =
    app.pods.length > 0 && runningPods === app.pods.length;

  const tabs: {
    id: DetailTab;
    label: string;
    count?: number;
    icon: React.ElementType;
  }[] = [
    { id: "overview", label: "Overview", icon: Layers },
    {
      id: "deployments",
      label: "Deployments",
      count: app.resourceCounts.deployments,
      icon: Box,
    },
    {
      id: "services",
      label: "Services",
      count: app.resourceCounts.services,
      icon: Network,
    },
    {
      id: "ingresses",
      label: "Ingresses",
      count: app.resourceCounts.ingresses,
      icon: Globe,
    },
    {
      id: "storage",
      label: "Storage",
      count: app.resourceCounts.pvcs,
      icon: HardDrive,
    },
    {
      id: "pods",
      label: "Pods",
      count: app.resourceCounts.pods,
      icon: Cpu,
    },
  ];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className="w-full sm:max-w-2xl flex flex-col p-0 gap-0"
          showCloseButton={false}
        >
          {/* Accessibility */}
          <SheetTitle className="sr-only">
            {app.name} — Application Details
          </SheetTitle>
          <SheetDescription className="sr-only">
            Details for {app.name} in namespace {app.namespace}
          </SheetDescription>

          {/* Status accent bar */}
          <div className={cn("h-1 w-full shrink-0", statusCfg.bar)} />

          {/* Header */}
          <div className="px-5 pt-4 pb-4 border-b border-border shrink-0">
            <div className="flex items-start justify-between gap-3">
              {/* App identity */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "size-2.5 rounded-full shrink-0",
                      statusCfg.dot
                    )}
                  />
                  <h2 className="text-base font-semibold leading-tight truncate">
                    {app.name}
                  </h2>
                </div>
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 px-1.5 font-mono"
                  >
                    {app.namespace}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] h-5 px-1.5", statusCfg.badge)}
                  >
                    {app.status}
                  </Badge>
                  {app.managedBy && (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 px-1.5 border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400"
                    >
                      {app.managedBy}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <TooltipProvider>
                <div className="flex items-center gap-1 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteOpen(true)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Delete application
                    </TooltipContent>
                  </Tooltip>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <X className="size-4" />
                      <span className="sr-only">Close</span>
                    </Button>
                  </SheetClose>
                </div>
              </TooltipProvider>
            </div>

            {/* Quick stats row */}
            <div className="mt-3 flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
              {app.pods.length > 0 ? (
                <span className="flex items-center gap-1.5">
                  <Cpu className="size-3.5" />
                  <span>
                    <span
                      className={cn(
                        "font-medium",
                        allPodsRunning
                          ? "text-emerald-600 dark:text-emerald-400"
                          : runningPods < app.pods.length
                            ? "text-red-600 dark:text-red-400"
                            : ""
                      )}
                    >
                      {runningPods}
                    </span>
                    <span>/{app.pods.length} pods running</span>
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Cpu className="size-3.5" />
                  {app.resourceCounts.pods} pods
                </span>
              )}
              {app.age && (
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {app.age}
                </span>
              )}
              {app.hosts.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Globe className="size-3.5" />
                  {app.hosts.length} endpoint
                  {app.hosts.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div className="border-b border-border shrink-0 overflow-x-auto">
            <div className="flex px-1 min-w-max">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors whitespace-nowrap border-b-2 -mb-px",
                    tab === t.id
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <t.icon className="size-3.5" />
                  {t.label}
                  {t.count != null && t.count > 0 && (
                    <span
                      className={cn(
                        "ml-0.5 rounded-full px-1.5 min-w-[18px] text-center text-[10px] font-semibold leading-[18px]",
                        tab === t.id
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-5">
              {tab === "overview" && <OverviewTab app={app} />}
              {tab === "deployments" && <DeploymentsTab app={app} />}
              {tab === "services" && <ServicesTab app={app} />}
              {tab === "ingresses" && <IngressesTab app={app} />}
              {tab === "storage" && <StorageTab app={app} />}
              {tab === "pods" && <PodsTab app={app} />}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {deleteOpen && (
        <DeleteApplicationDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          app={app}
          clusterId={clusterId}
          onDeleted={() => {
            setDeleteOpen(false);
            onOpenChange(false);
            onDeleted();
          }}
        />
      )}
    </>
  );
}

// ─── Tab content components ───────────────────────────────────────────────────

function OverviewTab({ app }: { app: DiscoveredApplication }) {
  const resources = [
    { label: "Deployments", count: app.resourceCounts.deployments, icon: Box },
    { label: "Services", count: app.resourceCounts.services, icon: Network },
    { label: "Ingresses", count: app.resourceCounts.ingresses, icon: Globe },
    { label: "PVCs", count: app.resourceCounts.pvcs, icon: HardDrive },
    { label: "Pods", count: app.resourceCounts.pods, icon: Cpu },
  ];

  const discoveryLabel: Record<DiscoveredApplication["groupingSource"], string> =
    {
      label: "Label selector",
      "selector-match": "Selector match",
      "name-convention": "Name convention",
    };

  return (
    <div className="space-y-6">
      {/* Resource summary tiles */}
      <section>
        <SectionHeading>Resources</SectionHeading>
        <div className="grid grid-cols-5 gap-2">
          {resources.map(({ label, count, icon: Icon }) => (
            <div
              key={label}
              className={cn(
                "rounded-lg border border-border p-3 text-center transition-opacity",
                count === 0 && "opacity-40"
              )}
            >
              <Icon className="size-4 mx-auto mb-1.5 text-muted-foreground" />
              <p className="text-xl font-bold tabular-nums">{count}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* External endpoints */}
      {app.hosts.length > 0 && (
        <section>
          <SectionHeading>External Endpoints</SectionHeading>
          <div className="space-y-1.5">
            {app.hosts.map((host) => (
              <a
                key={host}
                href={`https://${host}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors group"
              >
                <span className="font-mono text-xs truncate">{host}</span>
                <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Container images */}
      {app.images.length > 0 && (
        <section>
          <SectionHeading>Container Images</SectionHeading>
          <div className="space-y-1.5">
            {app.images.map((img) => (
              <div
                key={img}
                className="rounded-md border border-border bg-muted/30 px-3 py-2.5"
              >
                <p className="text-xs font-mono text-foreground/80 break-all leading-relaxed">
                  {img}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Metadata */}
      <section>
        <SectionHeading>Metadata</SectionHeading>
        <div className="grid grid-cols-2 gap-2">
          <MetaItem label="Namespace" value={app.namespace} mono />
          <MetaItem label="Age" value={app.age || "—"} />
          <MetaItem
            label="Discovery"
            value={discoveryLabel[app.groupingSource]}
          />
          <MetaItem label="Managed By" value={app.managedBy || "—"} />
        </div>
      </section>
    </div>
  );
}

function DeploymentsTab({ app }: { app: DiscoveredApplication }) {
  if (app.deployments.length === 0)
    return <EmptyState kind="deployments" />;

  return (
    <div className="space-y-2">
      {app.deployments.map((d) => {
        const [readyStr, totalStr] = d.ready.split("/");
        const ready = parseInt(readyStr ?? "0");
        const total = parseInt(totalStr ?? String(d.replicas));
        const isHealthy = ready > 0 && ready === total;
        const isDegraded = ready < total;

        return (
          <div
            key={d.name}
            className="rounded-lg border border-border p-3.5 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "size-2 rounded-full shrink-0",
                    isHealthy
                      ? "bg-emerald-500"
                      : isDegraded
                        ? "bg-red-500 animate-pulse"
                        : "bg-muted-foreground"
                  )}
                />
                <span className="text-sm font-medium truncate">{d.name}</span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {d.age}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs flex-wrap">
              <span
                className={cn(
                  "font-semibold",
                  isHealthy
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isDegraded
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground"
                )}
              >
                {d.ready} ready
              </span>
              <span className="text-border/80">·</span>
              <span className="text-muted-foreground">
                {d.upToDate}/{d.replicas} up-to-date
              </span>
              <span className="text-border/80">·</span>
              <span className="text-muted-foreground">
                {d.available} available
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ServicesTab({ app }: { app: DiscoveredApplication }) {
  if (app.services.length === 0) return <EmptyState kind="services" />;

  const typeColors: Record<string, string> = {
    ClusterIP:
      "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400",
    NodePort:
      "bg-orange-500/10 text-orange-700 border-orange-500/30 dark:text-orange-400",
    LoadBalancer:
      "bg-purple-500/10 text-purple-700 border-purple-500/30 dark:text-purple-400",
    ExternalName:
      "bg-yellow-500/10 text-yellow-700 border-yellow-500/30 dark:text-yellow-400",
  };

  return (
    <div className="space-y-2">
      {app.services.map((s) => (
        <div
          key={s.name}
          className="rounded-lg border border-border p-3.5 space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium truncate">{s.name}</span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] h-5 px-1.5 shrink-0",
                typeColors[s.type] ?? "bg-muted text-muted-foreground border-border"
              )}
            >
              {s.type}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            {s.clusterIP && s.clusterIP !== "None" && (
              <span className="font-mono">{s.clusterIP}</span>
            )}
            {s.ports && (
              <>
                <span className="text-border/80">·</span>
                <span>{s.ports}</span>
              </>
            )}
            {s.externalIP && s.externalIP !== "<none>" && (
              <>
                <span className="text-border/80">·</span>
                <span className="font-mono">{s.externalIP}</span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function IngressesTab({ app }: { app: DiscoveredApplication }) {
  if (app.ingresses.length === 0) return <EmptyState kind="ingresses" />;

  return (
    <div className="space-y-2">
      {app.ingresses.map((i) => {
        const hosts = i.hosts
          ? i.hosts
              .split(",")
              .map((h) => h.trim())
              .filter(Boolean)
          : [];

        return (
          <div
            key={i.name}
            className="rounded-lg border border-border p-3.5 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium truncate">{i.name}</span>
              <div className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
                {i.ingressClass && (
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 px-1.5"
                  >
                    {i.ingressClass}
                  </Badge>
                )}
                <span>{i.age}</span>
              </div>
            </div>
            {hosts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {hosts.map((host) => (
                  <a
                    key={host}
                    href={`https://${host}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs font-mono hover:bg-muted transition-colors group"
                  >
                    {host}
                    <ExternalLink className="size-3 text-muted-foreground group-hover:text-foreground shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StorageTab({ app }: { app: DiscoveredApplication }) {
  if (app.pvcs.length === 0) return <EmptyState kind="persistent volume claims" />;

  const pvcStatusColors: Record<string, string> = {
    Bound: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
    Pending:
      "bg-yellow-500/10 text-yellow-700 border-yellow-500/30 dark:text-yellow-400",
    Lost: "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-400",
  };

  return (
    <div className="space-y-2">
      {app.pvcs.map((p) => (
        <div
          key={p.name}
          className="rounded-lg border border-border p-3.5 space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium truncate">{p.name}</span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] h-5 px-1.5 shrink-0",
                pvcStatusColors[p.status] ??
                  "bg-muted text-muted-foreground border-border"
              )}
            >
              {p.status}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            <span className="font-medium text-foreground/70">
              {p.actualCapacity || p.requestedCapacity}
            </span>
            {p.storageClassName && (
              <>
                <span className="text-border/80">·</span>
                <span>{p.storageClassName}</span>
              </>
            )}
            {p.accessModes.length > 0 && (
              <>
                <span className="text-border/80">·</span>
                <span>{p.accessModes.join(", ")}</span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function PodsTab({ app }: { app: DiscoveredApplication }) {
  if (app.pods.length === 0) return <EmptyState kind="pods" />;

  const runningCount = app.pods.filter((p) => p.status === "Running").length;
  const pendingCount = app.pods.filter((p) => p.status === "Pending").length;
  const failedCount = app.pods.filter(
    (p) => p.status !== "Running" && p.status !== "Pending" && p.status !== "Succeeded"
  ).length;

  return (
    <div className="space-y-4">
      {/* Status summary */}
      <div className="flex items-center gap-3 flex-wrap text-xs font-medium">
        {runningCount > 0 && (
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-500" />
            {runningCount} Running
          </span>
        )}
        {pendingCount > 0 && (
          <span className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400">
            <span className="size-2 rounded-full bg-yellow-500 animate-pulse" />
            {pendingCount} Pending
          </span>
        )}
        {failedCount > 0 && (
          <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
            <span className="size-2 rounded-full bg-red-500 animate-pulse" />
            {failedCount} Failed
          </span>
        )}
      </div>

      {/* Pod rows */}
      <div className="space-y-2">
        {app.pods.map((p) => {
          const isRunning = p.status === "Running";
          const isPending = p.status === "Pending";
          const hasHighRestarts = p.restarts > 5;

          return (
            <div
              key={p.name}
              className="rounded-lg border border-border p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "size-2 rounded-full shrink-0",
                      isRunning
                        ? "bg-emerald-500"
                        : isPending
                          ? "bg-yellow-500 animate-pulse"
                          : "bg-red-500 animate-pulse"
                    )}
                  />
                  <span className="text-xs font-mono truncate">{p.name}</span>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] h-5 px-1.5 shrink-0",
                    POD_STATUS_COLORS[p.status] ??
                      "bg-muted text-muted-foreground border-border"
                  )}
                >
                  {p.status}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                <span>{p.ready} ready</span>
                <span className="text-border/80">·</span>
                <span
                  className={cn(
                    hasHighRestarts &&
                      "text-red-500 dark:text-red-400 font-semibold"
                  )}
                >
                  {p.restarts} restart{p.restarts !== 1 ? "s" : ""}
                </span>
                {p.node && (
                  <>
                    <span className="text-border/80">·</span>
                    <span className="truncate">{p.node}</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
      {children}
    </h3>
  );
}

function MetaItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-md border border-border px-3 py-2.5">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className={cn("text-sm mt-0.5 truncate", mono && "font-mono text-xs")}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({ kind }: { kind: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-3 mb-3">
        <Layers className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground/70">
        No {kind} found
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        This application has no {kind} associated with it.
      </p>
    </div>
  );
}

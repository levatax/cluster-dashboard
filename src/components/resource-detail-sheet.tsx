"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Scale,
  Trash2,
  Code,
  Terminal as TerminalIcon,
  Server,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ScaleDialog } from "@/components/scale-dialog";
import { deleteResourceAction, fetchDeploymentPods } from "@/app/actions/kubernetes";
import type {
  PodInfo,
  DeploymentInfo,
  ServiceInfo,
  IngressInfo,
  ConfigMapInfo,
  SecretInfo,
} from "@/lib/types";

type ResourceType = "pod" | "deployment" | "service" | "ingress" | "configmap" | "secret";
type Resource = PodInfo | DeploymentInfo | ServiceInfo | IngressInfo | ConfigMapInfo | SecretInfo;

const RESOURCE_API_MAP: Record<ResourceType, { apiVersion: string; kind: string }> = {
  pod: { apiVersion: "v1", kind: "Pod" },
  deployment: { apiVersion: "apps/v1", kind: "Deployment" },
  service: { apiVersion: "v1", kind: "Service" },
  ingress: { apiVersion: "networking.k8s.io/v1", kind: "Ingress" },
  configmap: { apiVersion: "v1", kind: "ConfigMap" },
  secret: { apiVersion: "v1", kind: "Secret" },
};

const typeLabels: Record<ResourceType, string> = {
  pod: "Pod",
  deployment: "Deployment",
  service: "Service",
  ingress: "Ingress",
  configmap: "ConfigMap",
  secret: "Secret",
};

interface ResourceDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ResourceType | null;
  resource: Resource | null;
  clusterId: string;
  onViewLogs?: (pod: PodInfo) => void;
  onRefresh?: () => void;
  onEditYaml?: (apiVersion: string, kind: string, name: string, namespace: string) => void;
  onOpenTerminal?: (pod: PodInfo) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function podStatusStyle(status: string): string {
  const s = status.toLowerCase();
  if (s === "running")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (s === "succeeded" || s === "completed")
    return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400";
  if (s === "pending" || s === "containercreating")
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  if (s === "terminating")
    return "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400";
  return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400";
}

function containerDotColor(state: string, ready: boolean): string {
  if (ready && state === "Running") return "bg-emerald-500";
  if (state === "Waiting") return "bg-amber-500";
  return "bg-red-500";
}

function containerBadgeStyle(state: string, ready: boolean): string {
  if (ready && state === "Running")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (state === "Waiting")
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400";
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function Field({
  label,
  value,
  children,
  mono = false,
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="mb-0.5 text-xs text-muted-foreground">{label}</p>
      {children ?? (
        <p className={`text-sm font-medium leading-snug ${mono ? "font-mono" : ""}`}>{value}</p>
      )}
    </div>
  );
}

function KVBadges({ label, data }: { label: string; data: Record<string, string> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className="flex flex-wrap gap-1">
        {entries.map(([k, v]) => (
          <Badge key={k} variant="secondary" className="font-mono text-xs font-normal">
            {k}={v}
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ─── Pod detail ───────────────────────────────────────────────────────────────

function PodDetail({
  pod,
  onViewLogs,
  onOpenTerminal,
}: {
  pod: PodInfo;
  onViewLogs?: (pod: PodInfo) => void;
  onOpenTerminal?: (pod: PodInfo) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Field label="Status">
          <Badge variant="outline" className={`mt-0.5 text-xs ${podStatusStyle(pod.status)}`}>
            {pod.status}
          </Badge>
        </Field>
        <Field label="Ready" value={pod.ready} />
        <Field label="Restarts" value={pod.restarts} />
        <Field label="Age" value={pod.age} />
        <Field label="Node" value={pod.node || "—"} mono />
        <Field label="Pod IP" value={pod.ip || "—"} mono />
      </div>

      {/* Pod actions */}
      {(onViewLogs || onOpenTerminal) && (
        <div className="flex gap-1.5">
          {onViewLogs && (
            <Button size="sm" variant="secondary" onClick={() => onViewLogs(pod)}>
              <FileText className="mr-1.5 size-3.5" />
              Logs
            </Button>
          )}
          {onOpenTerminal && (
            <Button size="sm" variant="secondary" onClick={() => onOpenTerminal(pod)}>
              <TerminalIcon className="mr-1.5 size-3.5" />
              Shell
            </Button>
          )}
        </div>
      )}

      {/* Containers */}
      <div>
        <SectionLabel>Containers ({pod.containers.length})</SectionLabel>
        <div className="divide-y rounded-md border">
          {pod.containers.map((c) => (
            <div key={c.name} className="flex items-start gap-3 px-3 py-2.5">
              <span
                className={`mt-1.5 size-2 shrink-0 rounded-full ${containerDotColor(c.state, c.ready)}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{c.name}</span>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-xs ${containerBadgeStyle(c.state, c.ready)}`}
                  >
                    {c.state}
                    {c.reason ? `: ${c.reason}` : ""}
                  </Badge>
                </div>
                <p
                  className="mt-0.5 truncate font-mono text-xs text-muted-foreground"
                  title={c.image}
                >
                  {c.image}
                </p>
                {c.restarts > 0 && (
                  <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                    {c.restarts} restart{c.restarts !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Labels + Annotations */}
      <KVBadges label="Labels" data={pod.labels} />
      <KVBadges label="Annotations" data={pod.annotations} />
    </div>
  );
}

// ─── Deployment detail ────────────────────────────────────────────────────────

function DeploymentDetail({
  deployment,
  clusterId,
  onRefresh,
}: {
  deployment: DeploymentInfo;
  clusterId: string;
  onRefresh?: () => void;
}) {
  const [scaleOpen, setScaleOpen] = useState(false);
  const [pods, setPods] = useState<PodInfo[]>([]);
  const [podsLoading, setPodsLoading] = useState(true);

  useEffect(() => {
    async function loadPods() {
      if (Object.keys(deployment.selector).length === 0) {
        setPodsLoading(false);
        return;
      }
      setPodsLoading(true);
      const result = await fetchDeploymentPods(
        clusterId,
        deployment.namespace,
        deployment.selector
      );
      if (result.success) setPods(result.data);
      setPodsLoading(false);
    }
    loadPods();
  }, [clusterId, deployment.namespace, deployment.selector]);

  const nodeGroups = pods.reduce(
    (acc, pod) => {
      const node = pod.node || "Unassigned";
      if (!acc[node]) acc[node] = [];
      acc[node].push(pod);
      return acc;
    },
    {} as Record<string, PodInfo[]>
  );

  return (
    <div className="space-y-5">
      <Button variant="outline" size="sm" onClick={() => setScaleOpen(true)}>
        <Scale className="mr-1.5 size-3.5" />
        Scale
      </Button>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Ready" value={deployment.ready} />
        <Field label="Replicas" value={deployment.replicas} />
        <Field label="Up-to-date" value={deployment.upToDate} />
        <Field label="Available" value={deployment.available} />
        <Field label="Age" value={deployment.age} />
      </div>

      {/* Pods by node */}
      <div>
        <SectionLabel>Pods by node</SectionLabel>
        {podsLoading ? (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Loading pods…
          </div>
        ) : pods.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pods found</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(nodeGroups).map(([node, nodePods]) => (
              <div key={node} className="rounded-md border">
                <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
                  <Server className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">{node}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {nodePods.length}
                  </Badge>
                </div>
                <div className="divide-y">
                  {nodePods.map((pod) => (
                    <div
                      key={pod.name}
                      className="flex items-center justify-between gap-2 px-3 py-2"
                    >
                      <span className="truncate font-mono text-xs">{pod.name}</span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">{pod.ready}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${podStatusStyle(pod.status)}`}
                        >
                          {pod.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conditions */}
      {deployment.conditions.length > 0 && (
        <div>
          <SectionLabel>Conditions</SectionLabel>
          <div className="space-y-1.5">
            {deployment.conditions.map((c) => (
              <div key={c.type} className="rounded-md border px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.type}</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      c.status === "True"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
                    }`}
                  >
                    {c.status}
                  </Badge>
                </div>
                {(c.reason || c.message) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.reason}
                    {c.reason && c.message ? " — " : ""}
                    {c.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <KVBadges label="Labels" data={deployment.labels} />
      <KVBadges label="Annotations" data={deployment.annotations} />

      <ScaleDialog
        open={scaleOpen}
        onOpenChange={setScaleOpen}
        clusterId={clusterId}
        namespace={deployment.namespace}
        deploymentName={deployment.name}
        currentReplicas={deployment.replicas}
        onSuccess={() => onRefresh?.()}
      />
    </div>
  );
}

// ─── Service detail ───────────────────────────────────────────────────────────

function ServiceDetail({ service }: { service: ServiceInfo }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type" value={service.type} />
        <Field label="Age" value={service.age} />
        <Field label="Cluster IP" value={service.clusterIP} mono />
        <Field label="External IP" value={service.externalIP || "—"} mono />
        <Field label="Ports" value={service.ports} mono />
      </div>
      <KVBadges label="Selector" data={service.selector} />
      <KVBadges label="Labels" data={service.labels} />
      <KVBadges label="Annotations" data={service.annotations} />
    </div>
  );
}

// ─── Ingress detail ───────────────────────────────────────────────────────────

function IngressDetail({ ingress }: { ingress: IngressInfo }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Hosts" value={ingress.hosts} />
        <Field label="Addresses" value={ingress.addresses || "—"} mono />
        <Field label="Ports" value={ingress.ports} />
        <Field label="Class" value={ingress.ingressClass || "—"} />
        <Field label="Age" value={ingress.age} />
      </div>

      {ingress.rules.length > 0 && (
        <div>
          <SectionLabel>Rules</SectionLabel>
          <div className="space-y-1.5">
            {ingress.rules.map((rule) => (
              <div key={rule.host} className="rounded-md border">
                <div className="border-b bg-muted/30 px-3 py-2">
                  <span className="text-xs font-medium">{rule.host}</span>
                </div>
                <div className="divide-y">
                  {rule.paths.map((p) => (
                    <div
                      key={p.path}
                      className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs"
                    >
                      <span className="font-mono text-muted-foreground">{p.path}</span>
                      <span className="font-mono text-muted-foreground">{p.backend}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <KVBadges label="Labels" data={ingress.labels} />
      <KVBadges label="Annotations" data={ingress.annotations} />
    </div>
  );
}

// ─── ConfigMap detail ─────────────────────────────────────────────────────────

function ConfigMapDetail({ configMap }: { configMap: ConfigMapInfo }) {
  const entries = Object.entries(configMap.data);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Keys" value={configMap.keyCount} />
        <Field label="Age" value={configMap.age} />
        {configMap.binaryDataKeys.length > 0 && (
          <div className="col-span-2">
            <Field label="Binary Keys" value={configMap.binaryDataKeys.join(", ")} mono />
          </div>
        )}
      </div>

      {entries.length > 0 && (
        <div>
          <SectionLabel>Data</SectionLabel>
          <div className="space-y-1.5">
            {entries.map(([key, value]) => (
              <div key={key} className="rounded-md border">
                <div className="border-b bg-muted/30 px-3 py-2">
                  <span className="font-mono text-xs font-medium">{key}</span>
                </div>
                <pre className="max-h-32 overflow-auto px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap break-all">
                  {value}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      <KVBadges label="Labels" data={configMap.labels} />
      <KVBadges label="Annotations" data={configMap.annotations} />
    </div>
  );
}

// ─── Secret detail ────────────────────────────────────────────────────────────

function SecretDetail({ secret }: { secret: SecretInfo }) {
  const entries = Object.entries(secret.data);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  function toggleReveal(key: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function decodeBase64(value: string): string {
    try {
      return atob(value);
    } catch {
      return value;
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type" value={secret.type} />
        <Field label="Keys" value={secret.keyCount} />
        <Field label="Age" value={secret.age} />
      </div>

      {entries.length > 0 && (
        <div>
          <SectionLabel>Data</SectionLabel>
          <div className="space-y-1.5">
            {entries.map(([key, value]) => (
              <div key={key} className="rounded-md border">
                <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
                  <span className="font-mono text-xs font-medium">{key}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => toggleReveal(key)}
                  >
                    {revealed.has(key) ? (
                      <EyeOff className="mr-1 size-3" />
                    ) : (
                      <Eye className="mr-1 size-3" />
                    )}
                    {revealed.has(key) ? "Hide" : "Reveal"}
                  </Button>
                </div>
                <pre className="max-h-32 overflow-auto px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap break-all">
                  {revealed.has(key) ? decodeBase64(value) : "••••••••••"}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      <KVBadges label="Labels" data={secret.labels} />
      <KVBadges label="Annotations" data={secret.annotations} />
    </div>
  );
}

// ─── Main sheet ───────────────────────────────────────────────────────────────

export function ResourceDetailSheet({
  open,
  onOpenChange,
  type,
  resource,
  clusterId,
  onViewLogs,
  onRefresh,
  onEditYaml,
  onOpenTerminal,
}: ResourceDetailSheetProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  if (!type || !resource) return null;

  const { apiVersion, kind } = RESOURCE_API_MAP[type];

  async function handleDelete() {
    if (!type || !resource) return;
    setDeleteLoading(true);
    try {
      const result = await deleteResourceAction(
        clusterId,
        apiVersion,
        kind,
        resource.name,
        resource.namespace
      );
      if (result.success) {
        toast.success(`Deleted ${kind} "${resource.name}"`);
        setDeleteOpen(false);
        onOpenChange(false);
        onRefresh?.();
      } else {
        toast.error(result.error);
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  // Sub-header description — richer for pods
  const pod = type === "pod" ? (resource as PodInfo) : null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col overflow-hidden sm:max-w-lg">
          {/* Header */}
          <SheetHeader className="shrink-0 border-b pb-4">
            <SheetTitle className="flex items-center gap-2 pr-6 text-base">
              <Badge variant="outline" className="shrink-0 font-normal">
                {typeLabels[type]}
              </Badge>
              <span className="truncate">{resource.name}</span>
            </SheetTitle>
            <SheetDescription asChild>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-mono text-xs">{resource.namespace}</span>
                {pod && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${podStatusStyle(pod.status)}`}
                    >
                      {pod.status}
                    </Badge>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-xs">Ready {pod.ready}</span>
                    {pod.restarts > 0 && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          {pod.restarts} restart{pod.restarts !== 1 ? "s" : ""}
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
            </SheetDescription>
          </SheetHeader>

          {/* Action toolbar */}
          <div className="flex shrink-0 items-center gap-1.5 border-b px-4 pb-3">
            {onEditYaml && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => onEditYaml(apiVersion, kind, resource.name, resource.namespace)}
              >
                <Code className="mr-1.5 size-3.5" />
                Edit YAML
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Delete
            </Button>
          </div>

          {/* Scrollable content */}
          <ScrollArea className="min-h-0 flex-1">
            <div className="px-4 py-4">
              {type === "pod" && (
                <PodDetail
                  pod={resource as PodInfo}
                  onViewLogs={onViewLogs}
                  onOpenTerminal={onOpenTerminal}
                />
              )}
              {type === "deployment" && (
                <DeploymentDetail
                  deployment={resource as DeploymentInfo}
                  clusterId={clusterId}
                  onRefresh={onRefresh}
                />
              )}
              {type === "service" && <ServiceDetail service={resource as ServiceInfo} />}
              {type === "ingress" && <IngressDetail ingress={resource as IngressInfo} />}
              {type === "configmap" && (
                <ConfigMapDetail configMap={resource as ConfigMapInfo} />
              )}
              {type === "secret" && <SecretDetail secret={resource as SecretInfo} />}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${kind}?`}
        description={`Are you sure you want to delete "${resource.name}" from namespace "${resource.namespace}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import { FileText, Scale, Trash2, Code, Terminal as TerminalIcon, Server, Loader2 } from "lucide-react";
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
} from "@/lib/types";

type ResourceType = "pod" | "deployment" | "service" | "ingress";
type Resource = PodInfo | DeploymentInfo | ServiceInfo | IngressInfo;

const RESOURCE_API_MAP: Record<ResourceType, { apiVersion: string; kind: string }> = {
  pod: { apiVersion: "v1", kind: "Pod" },
  deployment: { apiVersion: "apps/v1", kind: "Deployment" },
  service: { apiVersion: "v1", kind: "Service" },
  ingress: { apiVersion: "networking.k8s.io/v1", kind: "Ingress" },
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

function getPodStatusStyle(status: string): string {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "running") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  }
  if (normalizedStatus === "succeeded" || normalizedStatus === "completed") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400";
  }
  if (normalizedStatus === "pending" || normalizedStatus === "containercreating") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  }
  if (normalizedStatus === "terminating") {
    return "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400";
  }
  // Error states: NotReady, Failed, CrashLoopBackOff, Error, OOMKilled, etc.
  return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400";
}

function KeyValueSection({
  title,
  data,
}: {
  title: string;
  data: Record<string, string>;
}) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">{title}</h4>
      <div className="flex flex-wrap gap-1.5">
        {entries.map(([key, value]) => (
          <Badge
            key={key}
            variant="secondary"
            className="font-mono text-xs font-normal"
          >
            {key}={value}
          </Badge>
        ))}
      </div>
    </div>
  );
}

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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {onViewLogs && (
          <Button variant="outline" size="sm" onClick={() => onViewLogs(pod)}>
            <FileText className="mr-1 size-3.5" />
            View Logs
          </Button>
        )}
        {onOpenTerminal && (
          <Button variant="outline" size="sm" onClick={() => onOpenTerminal(pod)}>
            <TerminalIcon className="mr-1 size-3.5" />
            Terminal
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">Status</span>
          <p className="font-medium">{pod.status}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Ready</span>
          <p className="font-medium">{pod.ready}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Restarts</span>
          <p className="font-medium">{pod.restarts}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Age</span>
          <p className="font-medium">{pod.age}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Node</span>
          <p className="font-medium">{pod.node || "—"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">IP</span>
          <p className="font-mono font-medium">{pod.ip || "—"}</p>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Containers</h4>
        <div className="space-y-2">
          {pod.containers.map((c) => (
            <div
              key={c.name}
              className="bg-muted/50 rounded-md border p-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{c.name}</span>
                <Badge
                  variant="outline"
                  className={
                    c.ready
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
                  }
                >
                  {c.state}
                  {c.reason ? `: ${c.reason}` : ""}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 font-mono text-xs">
                {c.image}
              </p>
              {c.restarts > 0 && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Restarts: {c.restarts}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <Separator />
      <KeyValueSection title="Labels" data={pod.labels} />
      <KeyValueSection title="Annotations" data={pod.annotations} />
    </div>
  );
}

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
      if (result.success) {
        setPods(result.data);
      }
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
    <div className="space-y-4">
      <Button variant="outline" size="sm" onClick={() => setScaleOpen(true)}>
        <Scale className="mr-1 size-3.5" />
        Scale
      </Button>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">Ready</span>
          <p className="font-medium">{deployment.ready}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Replicas</span>
          <p className="font-medium">{deployment.replicas}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Up-to-date</span>
          <p className="font-medium">{deployment.upToDate}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Available</span>
          <p className="font-medium">{deployment.available}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Age</span>
          <p className="font-medium">{deployment.age}</p>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Pods by Node</h4>
        {podsLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
            <Loader2 className="size-4 animate-spin" />
            Loading pods...
          </div>
        ) : pods.length === 0 ? (
          <p className="text-muted-foreground text-sm">No pods found</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(nodeGroups).map(([node, nodePods]) => (
              <div
                key={node}
                className="bg-muted/50 rounded-md border p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Server className="size-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{node}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {nodePods.length} pod{nodePods.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {nodePods.map((pod) => (
                    <div
                      key={pod.name}
                      className="flex items-center justify-between text-sm bg-background/50 rounded px-2 py-1.5"
                    >
                      <span className="font-mono text-xs truncate flex-1 mr-2">
                        {pod.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">
                          {pod.ready}
                        </span>
                        <Badge
                          variant="outline"
                          className={getPodStatusStyle(pod.status)}
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

      {deployment.conditions.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Conditions</h4>
            <div className="space-y-2">
              {deployment.conditions.map((c) => (
                <div
                  key={c.type}
                  className="bg-muted/50 rounded-md border p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.type}</span>
                    <Badge
                      variant="outline"
                      className={
                        c.status === "True"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
                      }
                    >
                      {c.status}
                    </Badge>
                  </div>
                  {c.reason && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {c.reason}
                    </p>
                  )}
                  {c.message && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {c.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />
      <KeyValueSection title="Labels" data={deployment.labels} />
      <KeyValueSection title="Annotations" data={deployment.annotations} />

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

function ServiceDetail({ service }: { service: ServiceInfo }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">Type</span>
          <p className="font-medium">{service.type}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Cluster IP</span>
          <p className="font-mono font-medium">{service.clusterIP}</p>
        </div>
        <div>
          <span className="text-muted-foreground">External IP</span>
          <p className="font-mono font-medium">{service.externalIP}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Ports</span>
          <p className="font-mono font-medium">{service.ports}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Age</span>
          <p className="font-medium">{service.age}</p>
        </div>
      </div>

      <Separator />
      <KeyValueSection title="Selector" data={service.selector} />
      <Separator />
      <KeyValueSection title="Labels" data={service.labels} />
      <KeyValueSection title="Annotations" data={service.annotations} />
    </div>
  );
}

function IngressDetail({ ingress }: { ingress: IngressInfo }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">Hosts</span>
          <p className="font-medium">{ingress.hosts}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Addresses</span>
          <p className="font-mono font-medium">{ingress.addresses}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Ports</span>
          <p className="font-medium">{ingress.ports}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Class</span>
          <p className="font-medium">{ingress.ingressClass || "—"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Age</span>
          <p className="font-medium">{ingress.age}</p>
        </div>
      </div>

      {ingress.rules.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Rules</h4>
            <div className="space-y-2">
              {ingress.rules.map((rule) => (
                <div
                  key={rule.host}
                  className="bg-muted/50 rounded-md border p-3 text-sm"
                >
                  <span className="font-medium">{rule.host}</span>
                  <div className="mt-1.5 space-y-1">
                    {rule.paths.map((p) => (
                      <div
                        key={p.path}
                        className="text-muted-foreground flex items-center justify-between text-xs"
                      >
                        <span className="font-mono">{p.path}</span>
                        <span className="font-mono">{p.backend}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />
      <KeyValueSection title="Labels" data={ingress.labels} />
      <KeyValueSection title="Annotations" data={ingress.annotations} />
    </div>
  );
}

const typeLabels: Record<ResourceType, string> = {
  pod: "Pod",
  deployment: "Deployment",
  service: "Service",
  ingress: "Ingress",
};

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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl flex flex-col overflow-hidden">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Badge variant="outline">{typeLabels[type]}</Badge>
              <span className="truncate">{resource.name}</span>
            </SheetTitle>
            <SheetDescription>{resource.namespace}</SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0 px-4 pb-4">
            <div className="mb-4 flex flex-wrap gap-2">
              {onEditYaml && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditYaml(apiVersion, kind, resource.name, resource.namespace)}
                >
                  <Code className="mr-1 size-3.5" />
                  Edit YAML
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-1 size-3.5" />
                Delete
              </Button>
            </div>
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
            {type === "service" && (
              <ServiceDetail service={resource as ServiceInfo} />
            )}
            {type === "ingress" && (
              <IngressDetail ingress={resource as IngressInfo} />
            )}
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

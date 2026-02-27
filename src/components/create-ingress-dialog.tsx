"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  Check,
  ChevronsUpDown,
  Star,
  Globe,
  ArrowRight,
  Lock,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchServices,
  fetchNamespaces,
  fetchIngressClasses,
  applyResourceYamlAction,
} from "@/app/actions/kubernetes";
import type { ServiceInfo } from "@/lib/types";
import type * as k8s from "@kubernetes/client-node";

interface IngressClassInfo {
  name: string;
  controller: string;
  isDefault: boolean;
}

interface CreateIngressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clusterId: string;
  namespace?: string;
  onSuccess?: () => void;
}

function extractFirstPort(ports: string): string {
  const match = ports.match(/(\d+)/);
  return match ? match[1] : "80";
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 pb-3 border-b">
      <div className="mt-0.5 rounded-md bg-muted p-1.5 flex-shrink-0">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium leading-none">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}

export function CreateIngressDialog({
  open,
  onOpenChange,
  clusterId,
  namespace,
  onSuccess,
}: CreateIngressDialogProps) {
  const [svcs, setSvcs] = useState<ServiceInfo[]>([]);
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [ingressClasses, setIngressClasses] = useState<IngressClassInfo[]>([]);
  const [loadingSvcs, setLoadingSvcs] = useState(false);
  const [loadingNs, setLoadingNs] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);

  const [name, setName] = useState("");
  const [ns, setNs] = useState(namespace ?? "default");
  const [host, setHost] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceNamespace, setServiceNamespace] = useState("");
  const [servicePort, setServicePort] = useState("80");
  const [path, setPath] = useState("/");
  const [pathType, setPathType] = useState("Prefix");
  const [ingressClass, setIngressClass] = useState("");
  const [tlsEnabled, setTlsEnabled] = useState(false);
  const [tlsSecret, setTlsSecret] = useState("");

  const groupedServices = useMemo(() => {
    const groups: Record<string, ServiceInfo[]> = {};
    svcs.forEach((svc) => {
      const n = svc.namespace || "default";
      if (!groups[n]) groups[n] = [];
      groups[n].push(svc);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([namespace, services]) => ({
        namespace,
        services: services.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [svcs]);

  const selectedServiceDisplay = serviceName
    ? serviceNamespace
      ? `${serviceNamespace}/${serviceName}`
      : serviceName
    : "";

  // Live URL preview
  const previewUrl = host
    ? `${tlsEnabled ? "https" : "http"}://${host.trim()}${path !== "/" ? path : ""}`
    : null;

  useEffect(() => {
    if (!open) return;
    setName("");
    setNs(namespace ?? "default");
    setHost("");
    setServiceName("");
    setServiceNamespace("");
    setServicePort("80");
    setPath("/");
    setPathType("Prefix");
    setIngressClass("");
    setTlsEnabled(false);
    setTlsSecret("");

    setLoadingSvcs(true);
    fetchServices(clusterId)
      .then((r) => {
        if (r.success) setSvcs(r.data.filter((s) => s.name !== "kubernetes"));
      })
      .finally(() => setLoadingSvcs(false));

    setLoadingNs(true);
    fetchNamespaces(clusterId)
      .then((r) => {
        if (r.success) setNamespaces(r.data);
      })
      .finally(() => setLoadingNs(false));

    setLoadingClasses(true);
    fetchIngressClasses(clusterId)
      .then((r) => {
        if (r.success) {
          setIngressClasses(r.data);
          const defaultClass = r.data.find((c) => c.isDefault);
          if (defaultClass) setIngressClass(defaultClass.name);
        }
      })
      .finally(() => setLoadingClasses(false));
  }, [open, clusterId, namespace]);

  function handleHostChange(value: string) {
    setHost(value);
    if (!name) {
      const suggested = value
        .split(".")[0]
        .replace(/[^a-z0-9-]/g, "-")
        .toLowerCase();
      if (suggested) setName(suggested + "-ingress");
    }
  }

  function handleServiceChange(svc: ServiceInfo) {
    setServiceName(svc.name);
    setServiceNamespace(svc.namespace);
    if (svc.ports) setServicePort(extractFirstPort(svc.ports));
    if (svc.namespace) setNs(svc.namespace);
    setServiceOpen(false);
  }

  async function handleCreate() {
    if (!host.trim()) {
      toast.error("Host / domain is required");
      return;
    }
    if (!serviceName) {
      toast.error("Service name is required");
      return;
    }
    if (!name.trim()) {
      toast.error("Ingress name is required");
      return;
    }

    const portNum = parseInt(servicePort, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      toast.error("Service port must be a valid port number");
      return;
    }

    const manifest = {
      apiVersion: "networking.k8s.io/v1",
      kind: "Ingress",
      metadata: {
        name: name.trim(),
        namespace: ns || "default",
        ...(ingressClass
          ? { annotations: { "kubernetes.io/ingress.class": ingressClass } }
          : {}),
      },
      spec: {
        ...(ingressClass ? { ingressClassName: ingressClass } : {}),
        rules: [
          {
            host: host.trim(),
            http: {
              paths: [
                {
                  path: path || "/",
                  pathType,
                  backend: {
                    service: {
                      name: serviceName,
                      port: { number: portNum },
                    },
                  },
                },
              ],
            },
          },
        ],
        ...(tlsEnabled
          ? {
              tls: [
                {
                  hosts: [host.trim()],
                  ...(tlsSecret.trim() ? { secretName: tlsSecret.trim() } : {}),
                },
              ],
            }
          : {}),
      },
    };

    setSaving(true);
    try {
      const result = await applyResourceYamlAction(
        clusterId,
        manifest as unknown as k8s.KubernetesObject
      );
      if (result.success) {
        toast.success(`Ingress "${name}" created`);
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 p-0 sm:max-w-[560px] max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-base">Add Ingress</DialogTitle>
          <DialogDescription className="text-sm">
            Route an external domain to a Kubernetes service.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 min-h-0">

          {/* ── Section 1: Routing ── */}
          <div className="space-y-4">
            <SectionHeader
              icon={Globe}
              title="Routing"
              description="Where traffic comes from and where it goes"
            />

            {/* Domain */}
            <div className="space-y-1.5">
              <Label htmlFor="ci-host">
                Domain <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ci-host"
                placeholder="app.example.com"
                value={host}
                onChange={(e) => handleHostChange(e.target.value)}
                autoComplete="off"
                autoFocus
              />
              {previewUrl && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ArrowRight className="size-3 flex-shrink-0" />
                  <span className="font-mono truncate">{previewUrl}</span>
                </p>
              )}
            </div>

            {/* Service + Port */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_96px] gap-3">
              <div className="space-y-1.5">
                <Label>
                  Service <span className="text-destructive">*</span>
                </Label>
                {loadingSvcs ? (
                  <div className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Loading services…
                  </div>
                ) : svcs.length > 0 ? (
                  <Popover open={serviceOpen} onOpenChange={setServiceOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={serviceOpen}
                        className="w-full justify-between font-normal"
                      >
                        <span className="truncate">
                          {selectedServiceDisplay || "Select service…"}
                        </span>
                        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search services…" />
                        <CommandList className="max-h-48">
                          <CommandEmpty>No services found.</CommandEmpty>
                          {groupedServices.map((group) => (
                            <CommandGroup
                              key={group.namespace}
                              heading={group.namespace}
                            >
                              {group.services.map((svc) => (
                                <CommandItem
                                  key={`${svc.namespace}/${svc.name}`}
                                  value={`${svc.namespace}/${svc.name}`}
                                  onSelect={() => handleServiceChange(svc)}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 size-4 flex-shrink-0",
                                      serviceName === svc.name &&
                                        serviceNamespace === svc.namespace
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <span className="flex-1 truncate">
                                    {svc.name}
                                  </span>
                                  <span className="ml-2 text-xs text-muted-foreground font-mono flex-shrink-0">
                                    {svc.ports?.split(",")[0] || ""}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Input
                    placeholder="e.g. my-app"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ci-port">
                  Port <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ci-port"
                  type="number"
                  placeholder="80"
                  value={servicePort}
                  onChange={(e) => setServicePort(e.target.value)}
                  min={1}
                  max={65535}
                />
              </div>
            </div>

            {/* Path + PathType */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ci-path">Path</Label>
                <Input
                  id="ci-path"
                  placeholder="/"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Path Type</Label>
                <Select value={pathType} onValueChange={setPathType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Prefix">Prefix</SelectItem>
                    <SelectItem value="Exact">Exact</SelectItem>
                    <SelectItem value="ImplementationSpecific">ImplementationSpecific</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── Section 2: Configuration ── */}
          <div className="space-y-4">
            <SectionHeader
              icon={Settings2}
              title="Configuration"
              description="Metadata and controller settings"
            />

            {/* Name + Namespace */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ci-name">
                  Ingress Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ci-name"
                  placeholder="my-app-ingress"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {host && !name && (
                  <p className="text-xs text-muted-foreground">
                    Auto-fills from domain
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Namespace</Label>
                {loadingNs ? (
                  <div className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Loading…
                  </div>
                ) : (
                  <Select value={ns} onValueChange={setNs}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select namespace" />
                    </SelectTrigger>
                    <SelectContent>
                      {namespaces.map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Ingress Class */}
            <div className="space-y-1.5">
              <Label>Ingress Class</Label>
              {loadingClasses ? (
                <div className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> Loading…
                </div>
              ) : ingressClasses.length > 0 ? (
                <Select value={ingressClass} onValueChange={setIngressClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {ingressClasses.map((ic) => (
                      <SelectItem key={ic.name} value={ic.name}>
                        <span className="flex items-center gap-2">
                          {ic.name}
                          {ic.isDefault && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                              default
                            </Badge>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="nginx"
                  value={ingressClass}
                  onChange={(e) => setIngressClass(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* ── Section 3: TLS ── */}
          <div className="space-y-4">
            <SectionHeader
              icon={Lock}
              title="TLS / HTTPS"
              description="Terminate SSL at the ingress controller"
            />

            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Enable TLS</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Redirect HTTP to HTTPS and terminate SSL
                </p>
              </div>
              <Switch
                id="ci-tls"
                checked={tlsEnabled}
                onCheckedChange={setTlsEnabled}
              />
            </div>

            {tlsEnabled && (
              <div className="space-y-1.5">
                <Label htmlFor="ci-tls-secret">TLS Secret Name</Label>
                <Input
                  id="ci-tls-secret"
                  placeholder="my-app-tls  (optional — leave blank to omit)"
                  value={tlsSecret}
                  onChange={(e) => setTlsSecret(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Name of the Kubernetes Secret containing the TLS certificate. Leave blank if managed by cert-manager.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sticky footer */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t bg-muted/30">
          {previewUrl ? (
            <span className="text-xs text-muted-foreground font-mono truncate hidden sm:block">
              {previewUrl}
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Create Ingress
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Check, ChevronsUpDown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Checkbox } from "@/components/ui/checkbox";
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

// Extract the first numeric port from a ports string like "80/TCP, 443:30080/TCP"
function extractFirstPort(ports: string): string {
  const match = ports.match(/(\d+)/);
  return match ? match[1] : "80";
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

  // Group services by namespace
  const groupedServices = useMemo(() => {
    const groups: Record<string, ServiceInfo[]> = {};
    svcs.forEach((svc) => {
      const ns = svc.namespace || "default";
      if (!groups[ns]) groups[ns] = [];
      groups[ns].push(svc);
    });
    // Sort namespaces and services within each group
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([namespace, services]) => ({
        namespace,
        services: services.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [svcs]);

  // Combined service value for display
  const selectedServiceDisplay = serviceName
    ? serviceNamespace
      ? `${serviceNamespace}/${serviceName}`
      : serviceName
    : "";

  // Reset form and fetch data each time the dialog opens
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

    // Fetch services (all namespaces for better selection)
    setLoadingSvcs(true);
    fetchServices(clusterId)
      .then((r) => {
        if (r.success)
          setSvcs(r.data.filter((s) => s.name !== "kubernetes"));
      })
      .finally(() => setLoadingSvcs(false));

    // Fetch namespaces
    setLoadingNs(true);
    fetchNamespaces(clusterId)
      .then((r) => {
        if (r.success) setNamespaces(r.data);
      })
      .finally(() => setLoadingNs(false));

    // Fetch ingress classes
    setLoadingClasses(true);
    fetchIngressClasses(clusterId)
      .then((r) => {
        if (r.success) {
          setIngressClasses(r.data);
          // Auto-select default class if available
          const defaultClass = r.data.find((c) => c.isDefault);
          if (defaultClass) setIngressClass(defaultClass.name);
        }
      })
      .finally(() => setLoadingClasses(false));
  }, [open, clusterId, namespace]);

  function handleHostChange(value: string) {
    setHost(value);
    // Auto-suggest a name from the first label of the hostname
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
    // Auto-set namespace to match service namespace
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Ingress</DialogTitle>
          <DialogDescription>
            Route a domain to a Kubernetes service.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Domain */}
          <div className="space-y-1.5">
            <Label htmlFor="ci-host">Domain *</Label>
            <Input
              id="ci-host"
              placeholder="wordpress.example.com"
              value={host}
              onChange={(e) => handleHostChange(e.target.value)}
            />
          </div>

          {/* Service with search and grouping */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Service *</Label>
              {loadingSvcs ? (
                <div className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> Loading…
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
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search services…" />
                      <CommandList>
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
                                    "mr-2 size-4",
                                    serviceName === svc.name &&
                                      serviceNamespace === svc.namespace
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <span className="flex-1 truncate">
                                  {svc.name}
                                </span>
                                <span className="ml-2 text-xs text-muted-foreground">
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
                  placeholder="e.g. wordpress"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ci-port">Port *</Label>
              <Input
                id="ci-port"
                type="number"
                placeholder="80"
                value={servicePort}
                onChange={(e) => setServicePort(e.target.value)}
              />
            </div>
          </div>

          {/* Namespace + Ingress class */}
          <div className="grid grid-cols-2 gap-3">
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
                    {namespaces.map((namespace) => (
                      <SelectItem key={namespace} value={namespace}>
                        {namespace}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
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
                            <Star className="size-3 fill-amber-400 text-amber-400" />
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

          {/* Path */}
          <div className="grid grid-cols-2 gap-3">
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
                  <SelectItem value="ImplementationSpecific">
                    ImplementationSpecific
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* TLS */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="ci-tls"
              checked={tlsEnabled}
              onCheckedChange={(v) => setTlsEnabled(!!v)}
            />
            <Label htmlFor="ci-tls" className="cursor-pointer">
              Enable TLS (HTTPS)
            </Label>
          </div>
          {tlsEnabled && (
            <div className="space-y-1.5">
              <Label htmlFor="ci-tls-secret">TLS Secret Name</Label>
              <Input
                id="ci-tls-secret"
                placeholder="e.g. wordpress-tls (leave blank to omit)"
                value={tlsSecret}
                onChange={(e) => setTlsSecret(e.target.value)}
              />
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="ci-name">Ingress Name *</Label>
            <Input
              id="ci-name"
              placeholder="e.g. wordpress-ingress"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="mr-1 size-3.5 animate-spin" />}
            Create Ingress
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

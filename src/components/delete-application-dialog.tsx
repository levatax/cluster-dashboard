"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteApplicationResources } from "@/app/actions/kubernetes";
import type { DiscoveredApplication } from "@/lib/types";

interface DeleteApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: DiscoveredApplication;
  clusterId: string;
  onDeleted: () => void;
}

interface ResourceEntry {
  apiVersion: string;
  kind: string;
  name: string;
  namespace: string;
}

function buildResourceList(app: DiscoveredApplication): ResourceEntry[] {
  const resources: ResourceEntry[] = [];

  for (const ing of app.ingresses) {
    resources.push({ apiVersion: "networking.k8s.io/v1", kind: "Ingress", name: ing.name, namespace: ing.namespace });
  }
  for (const svc of app.services) {
    resources.push({ apiVersion: "v1", kind: "Service", name: svc.name, namespace: svc.namespace });
  }
  for (const dep of app.deployments) {
    resources.push({ apiVersion: "apps/v1", kind: "Deployment", name: dep.name, namespace: dep.namespace });
  }
  for (const pvc of app.pvcs) {
    resources.push({ apiVersion: "v1", kind: "PersistentVolumeClaim", name: pvc.name, namespace: pvc.namespace });
  }

  return resources;
}

const KIND_LABELS: Record<string, string> = {
  Ingress: "Ingresses",
  Service: "Services",
  Deployment: "Deployments",
  PersistentVolumeClaim: "PVCs",
};

export function DeleteApplicationDialog({
  open,
  onOpenChange,
  app,
  clusterId,
  onDeleted,
}: DeleteApplicationDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [results, setResults] = useState<{ deleted: string[]; errors: string[] } | null>(null);

  const resources = buildResourceList(app);

  // Group resources by kind for display
  const grouped = new Map<string, ResourceEntry[]>();
  for (const r of resources) {
    const existing = grouped.get(r.kind) || [];
    existing.push(r);
    grouped.set(r.kind, existing);
  }

  async function handleDelete() {
    setDeleting(true);
    setResults(null);
    const result = await deleteApplicationResources(clusterId, resources);
    if (result.success) {
      setResults(result.data);
      if (result.data.errors.length === 0) {
        toast.success(`Deleted all resources for "${app.name}"`);
        onOpenChange(false);
        onDeleted();
      } else if (result.data.deleted.length > 0) {
        toast.warning(`Partially deleted "${app.name}" — ${result.data.errors.length} error(s)`);
      } else {
        toast.error(`Failed to delete "${app.name}"`);
      }
    } else {
      toast.error(result.error);
    }
    setDeleting(false);
  }

  function handleOpenChange(v: boolean) {
    if (!deleting) {
      setConfirmed(false);
      setResults(null);
      onOpenChange(v);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            Delete Application
          </DialogTitle>
          <DialogDescription>
            This will delete all Kubernetes resources associated with{" "}
            <strong>{app.name}</strong> in namespace <strong>{app.namespace}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm font-medium">Resources to delete:</p>
          <div className="max-h-60 overflow-y-auto rounded-md border border-border bg-muted/50 p-3 space-y-2">
            {Array.from(grouped.entries()).map(([kind, items]) => (
              <div key={kind}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {KIND_LABELS[kind] || kind} ({items.length})
                </p>
                <ul className="mt-1 space-y-0.5">
                  {items.map((r) => {
                    const label = `${r.kind}/${r.namespace}/${r.name}`;
                    const isDeleted = results?.deleted.includes(label);
                    const error = results?.errors.find((e) => e.startsWith(label));
                    return (
                      <li key={`${r.kind}/${r.name}`} className="flex items-center gap-1.5 text-sm font-mono">
                        {results && (
                          isDeleted
                            ? <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                            : error
                              ? <XCircle className="size-3.5 text-red-500 shrink-0" />
                              : null
                        )}
                        <span className="truncate">{r.name}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {results && results.errors.length > 0 && (
            <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 space-y-1">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Errors:</p>
              {results.errors.map((err) => (
                <p key={err} className="text-xs text-red-600 dark:text-red-400 font-mono break-all">
                  {err}
                </p>
              ))}
            </div>
          )}

          {!results && (
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
                disabled={deleting}
              />
              <span className="text-sm">I understand this action cannot be undone</span>
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={deleting}>
            {results ? "Close" : "Cancel"}
          </Button>
          {(!results || results.errors.length > 0) && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!confirmed || deleting}
            >
              {deleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {deleting ? "Deleting..." : results ? "Retry Failed" : "Delete All Resources"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

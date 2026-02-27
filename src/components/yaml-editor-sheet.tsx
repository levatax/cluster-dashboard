"use client";

import { useState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import jsYaml from "js-yaml";
import { YamlEditor } from "@/components/yaml-editor";
import {
  getResourceYamlAction,
  applyResourceYamlAction,
} from "@/app/actions/kubernetes";
import type * as k8s from "@kubernetes/client-node";

interface YamlEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clusterId: string;
  apiVersion: string;
  kind: string;
  name: string;
  namespace: string;
  onSuccess?: () => void;
}

export function YamlEditorSheet({
  open,
  onOpenChange,
  clusterId,
  apiVersion,
  kind,
  name,
  namespace,
  onSuccess,
}: YamlEditorSheetProps) {
  const [yamlContent, setYamlContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getResourceYamlAction(clusterId, apiVersion, kind, name, namespace)
      .then((result) => {
        if (result.success) {
          // Strip managedFields and status for cleaner editing
          const obj = result.data as Record<string, unknown>;
          if (obj.metadata && typeof obj.metadata === "object") {
            const meta = obj.metadata as Record<string, unknown>;
            delete meta.managedFields;
          }
          delete obj.status;
          setYamlContent(jsYaml.dump(obj, { lineWidth: -1 }));
        } else {
          toast.error(result.error);
          onOpenChange(false);
        }
      })
      .finally(() => setLoading(false));
  }, [open, clusterId, apiVersion, kind, name, namespace, onOpenChange]);

  async function handleSave() {
    try {
      const parsed = jsYaml.load(yamlContent) as k8s.KubernetesObject;
      if (!parsed || typeof parsed !== "object" || !parsed.apiVersion || !parsed.kind || !parsed.metadata) {
        toast.error("Invalid YAML: must have apiVersion, kind, and metadata");
        return;
      }

      setSaving(true);
      const result = await applyResourceYamlAction(clusterId, parsed);
      if (result.success) {
        toast.success(`Applied ${kind} "${name}" successfully`);
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid YAML");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-3xl flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle>Edit {kind}: {name}</SheetTitle>
          <SheetDescription>{namespace}</SheetDescription>
        </SheetHeader>
        <div className="flex gap-2 px-4">
          <Button size="sm" onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <Loader2 className="mr-1 size-3.5 animate-spin" />
            ) : (
              <Save className="mr-1 size-3.5" />
            )}
            Save
          </Button>
        </div>
        <div className="flex-1 overflow-hidden px-4 pb-4">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="text-muted-foreground size-6 animate-spin" />
            </div>
          ) : (
            <YamlEditor value={yamlContent} onChange={setYamlContent} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

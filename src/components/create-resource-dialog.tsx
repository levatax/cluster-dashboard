"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import jsYaml from "js-yaml";
import { YamlEditor } from "@/components/yaml-editor";
import { applyResourceYamlAction } from "@/app/actions/kubernetes";
import type * as k8s from "@kubernetes/client-node";

interface CreateResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clusterId: string;
  onSuccess?: () => void;
}

const TEMPLATE = `apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config
  namespace: default
data:
  key: value
`;

export function CreateResourceDialog({
  open,
  onOpenChange,
  clusterId,
  onSuccess,
}: CreateResourceDialogProps) {
  const [yamlContent, setYamlContent] = useState(TEMPLATE);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    try {
      const parsed = jsYaml.load(yamlContent) as k8s.KubernetesObject;
      if (!parsed || typeof parsed !== "object" || !parsed.apiVersion || !parsed.kind || !parsed.metadata) {
        toast.error("Invalid YAML: must have apiVersion, kind, and metadata");
        return;
      }

      setLoading(true);
      const result = await applyResourceYamlAction(clusterId, parsed);
      if (result.success) {
        toast.success(`Created ${parsed.kind} "${parsed.metadata.name}"`);
        onOpenChange(false);
        setYamlContent(TEMPLATE);
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid YAML");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl flex flex-col" style={{ height: "70vh" }}>
        <DialogHeader>
          <DialogTitle>Create Resource</DialogTitle>
          <DialogDescription>
            Paste or write a Kubernetes resource manifest in YAML format.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <YamlEditor value={yamlContent} onChange={setYamlContent} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

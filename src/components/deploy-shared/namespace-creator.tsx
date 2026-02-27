"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";

interface NamespaceCreatorProps {
  clusterId: string;
  onCreated?: (namespace: string) => void;
}

export function NamespaceCreator({ clusterId, onCreated }: NamespaceCreatorProps) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    setError("");

    try {
      const { applyResourceYamlAction } = await import("@/app/actions/kubernetes");
      const result = await applyResourceYamlAction(clusterId, {
        apiVersion: "v1",
        kind: "Namespace",
        metadata: { name: name.trim() },
      });

      if (result.success) {
        onCreated?.(name.trim());
        setName("");
      } else {
        setError(result.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create namespace");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New namespace name"
          className="flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleCreate}
          disabled={creating || !name.trim()}
        >
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

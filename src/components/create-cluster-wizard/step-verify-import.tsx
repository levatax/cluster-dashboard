"use client";

import { useState } from "react";
import { AlertTriangle, Plug, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { testKubeconfigConnection } from "@/app/actions/clusters";
import type { MasterNodeConfig } from "./types";

interface StepVerifyImportProps {
  master: MasterNodeConfig;
  kubeconfigYaml: string;
  onKubeconfigChange: (yaml: string) => void;
}

interface ConnectionResult {
  status: "idle" | "testing" | "success" | "error";
  version?: string;
  nodeCount?: number;
  error?: string;
}

export function StepVerifyImport({
  master,
  kubeconfigYaml,
  onKubeconfigChange,
}: StepVerifyImportProps) {
  const [connection, setConnection] = useState<ConnectionResult>({
    status: "idle",
  });

  const hasLocalhost =
    kubeconfigYaml.includes("127.0.0.1") ||
    kubeconfigYaml.includes("localhost");

  function handleAutoFix() {
    const fixed = kubeconfigYaml
      .replace(/https?:\/\/127\.0\.0\.1/g, `https://${master.ip}`)
      .replace(/https?:\/\/localhost/g, `https://${master.ip}`);
    onKubeconfigChange(fixed);
    toast.success("Server URL updated to " + master.ip);
  }

  async function handleTestConnection() {
    setConnection({ status: "testing" });
    const result = await testKubeconfigConnection(kubeconfigYaml);
    if (result.success) {
      setConnection({
        status: "success",
        version: result.data.version,
        nodeCount: result.data.nodeCount,
      });
    } else {
      setConnection({ status: "error", error: result.error });
    }
  }

  return (
    <div className="space-y-4">
      {hasLocalhost && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>
              Kubeconfig contains <code className="font-mono">127.0.0.1</code>{" "}
              or <code className="font-mono">localhost</code> — this won&apos;t
              work remotely.
            </span>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={handleAutoFix}
            >
              Auto-fix Server URL
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="kubeconfig-final">Kubeconfig YAML</Label>
        <Textarea
          id="kubeconfig-final"
          value={kubeconfigYaml}
          onChange={(e) => onKubeconfigChange(e.target.value)}
          rows={8}
          className="min-h-[150px] resize-y font-mono text-xs"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTestConnection}
          disabled={connection.status === "testing" || !kubeconfigYaml.trim()}
        >
          {connection.status === "testing" ? (
            <Loader2 className="mr-2 size-3.5 animate-spin" />
          ) : (
            <Plug className="mr-2 size-3.5" />
          )}
          Test Connection
        </Button>

        {connection.status === "success" && (
          <Badge variant="outline" className="border-green-500/50 text-green-500">
            Connected
          </Badge>
        )}
        {connection.status === "error" && (
          <Badge variant="outline" className="border-red-500/50 text-red-500">
            Failed
          </Badge>
        )}
      </div>

      {connection.status === "success" && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
          <p className="text-sm font-medium text-green-600 dark:text-green-400">
            Connection successful
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Kubernetes {connection.version} &middot; {connection.nodeCount}{" "}
            {connection.nodeCount === 1 ? "node" : "nodes"}
          </p>
        </div>
      )}

      {connection.status === "error" && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            Connection failed
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {connection.error}
          </p>
        </div>
      )}
    </div>
  );
}

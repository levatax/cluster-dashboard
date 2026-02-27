"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { importCluster } from "@/app/actions/clusters";

export function ImportDialog() {
  const [open, setOpen] = useState(false);
  const [yaml, setYaml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setYaml(text);
    setError("");
    e.target.value = "";
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.set("kubeconfig", yaml);

    const result = await importCluster(formData);

    if (result.success) {
      toast.success("Cluster imported successfully");
      setOpen(false);
      setYaml("");
      router.refresh();
    } else {
      setError(result.error || "Import failed");
    }
    setLoading(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setYaml("");
      setError("");
    }
  }

  const lineCount = yaml ? yaml.split("\n").length : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 size-4" />
          Import kubeconfig
        </Button>
      </DialogTrigger>

      <DialogContent className="flex flex-col gap-0 p-0 sm:max-w-[560px] max-h-[85vh]">

        {/* Sticky header */}
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-base">Import Cluster</DialogTitle>
          <DialogDescription className="text-sm">
            Paste your kubeconfig YAML or upload a{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">.yaml</code>
            {" / "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">.conf</code>{" "}
            file.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">

          {/* Upload row */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 size-3.5" />
              Upload file
            </Button>
            {yaml && (
              <span className="text-xs text-muted-foreground">
                {lineCount} line{lineCount !== 1 ? "s" : ""} loaded
              </span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".yaml,.yml,.conf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Textarea — fixed min-height, no resize, scrolls internally */}
          <Textarea
            placeholder={"apiVersion: v1\nclusters:\n- cluster:\n    server: https://...\n  name: my-cluster\n..."}
            value={yaml}
            onChange={(e) => {
              setYaml(e.target.value);
              setError("");
            }}
            className="min-h-[260px] flex-1 resize-none overflow-auto font-mono text-xs leading-relaxed whitespace-pre"
            spellCheck={false}
            autoComplete="off"
          />

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t bg-muted/30 px-6 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={loading || !yaml.trim()}
          >
            {loading ? "Importing…" : "Import Cluster"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Upload } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          Import Cluster
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>Import Cluster</DialogTitle>
            <DialogDescription>
              Paste your kubeconfig YAML or upload a file.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 size-4" />
                Upload File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".yaml,.yml,.conf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <Textarea
              placeholder="Paste kubeconfig YAML here..."
              value={yaml}
              onChange={(e) => {
                setYaml(e.target.value);
                setError("");
              }}
              rows={12}
              className="min-h-[200px] w-full resize-y font-mono text-xs break-all whitespace-pre-wrap"
            />
            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}
          </div>
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !yaml.trim()}>
              {loading ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  Layers,
  Terminal,
  Upload,
  ChevronRight,
  ChevronLeft,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { importCluster } from "@/app/actions/clusters";

const ONBOARDED_KEY = "k8s-dashboard-onboarded";

interface OnboardingWizardProps {
  hasClusters: boolean;
}

const steps = [
  { id: "welcome", title: "Welcome" },
  { id: "kubeconfig", title: "Get Kubeconfig" },
  { id: "import", title: "Import" },
] as const;

function shouldAutoOpen(hasClusters: boolean): boolean {
  if (hasClusters) return false;
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(ONBOARDED_KEY);
}

export function OnboardingWizard({ hasClusters }: OnboardingWizardProps) {
  const [open, setOpen] = useState(() => shouldAutoOpen(hasClusters));
  const [step, setStep] = useState(0);
  const [yaml, setYaml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleClose() {
    setOpen(false);
    localStorage.setItem(ONBOARDED_KEY, "true");
  }

  function handleOpenWizard() {
    setStep(0);
    setYaml("");
    setError("");
    setOpen(true);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setYaml(text);
    setError("");
  }

  async function handleImport() {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.set("kubeconfig", yaml);

    const result = await importCluster(formData);

    if (result.success) {
      toast.success("Cluster imported successfully!");
      localStorage.setItem(ONBOARDED_KEY, "true");
      setOpen(false);
      setYaml("");
      router.refresh();
    } else {
      setError(result.error || "Import failed");
    }
    setLoading(false);
  }

  // If clusters exist and user has been onboarded, don't render anything
  if (hasClusters) return null;

  return (
    <>
      {/* Empty state button to re-open wizard */}
      {!open && (
        <Button variant="outline" onClick={handleOpenWizard}>
          <Rocket className="mr-2 size-4" />
          Start Setup Wizard
        </Button>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
        <DialogContent className="sm:max-w-lg">
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 pb-2">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  aria-label={`Step ${i + 1}: ${s.title}`}
                  aria-current={i === step ? "step" : undefined}
                  className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    i === step
                      ? "bg-primary text-primary-foreground"
                      : i < step
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-px w-8 ${i < step ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <>
                  <DialogHeader>
                    <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--gradient-from)] to-[var(--gradient-to)] shadow-lg">
                      <Layers className="size-7 text-white" />
                    </div>
                    <DialogTitle className="text-center text-xl">
                      Welcome to K8s Dashboard
                    </DialogTitle>
                    <DialogDescription className="text-center">
                      Manage your Kubernetes clusters from a single, intuitive
                      interface. Monitor nodes, pods, deployments, and more — all
                      in real time.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-2 rounded-lg border border-border/50 bg-muted/30 p-4">
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                        Real-time cluster monitoring & health checks
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                        Manage pods, deployments, services & ingresses
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                        Deploy from GitHub, Docker Hub, or the App Store
                      </li>
                    </ul>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Terminal className="size-5" />
                      Get Your Kubeconfig
                    </DialogTitle>
                    <DialogDescription>
                      You&apos;ll need a kubeconfig file to connect your cluster.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                      <p className="mb-2 text-sm font-medium">Option 1: Export from kubectl</p>
                      <code className="block rounded bg-muted px-3 py-2 font-mono text-xs">
                        kubectl config view --raw
                      </code>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Copy the output and paste it in the next step.
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                      <p className="mb-2 text-sm font-medium">Option 2: Find the file</p>
                      <code className="block rounded bg-muted px-3 py-2 font-mono text-xs">
                        ~/.kube/config
                      </code>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Upload this file directly in the next step.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Upload className="size-5" />
                      Import Your Cluster
                    </DialogTitle>
                    <DialogDescription>
                      Paste your kubeconfig YAML or upload the file.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-2 space-y-3">
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
                      rows={8}
                      className="min-h-[150px] w-full resize-y font-mono text-xs"
                    />
                    {error && <p className="text-destructive text-sm">{error}</p>}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <DialogFooter className="flex-row justify-between sm:justify-between">
            <div>
              {step > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
                  <ChevronLeft className="mr-1 size-3.5" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Skip
              </Button>
              {step < 2 ? (
                <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                  Next
                  <ChevronRight className="ml-1 size-3.5" />
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  {!yaml.trim() && (
                    <p className="text-xs text-muted-foreground">Paste your kubeconfig above to continue.</p>
                  )}
                  <Button
                    size="sm"
                    onClick={handleImport}
                    disabled={loading || !yaml.trim()}
                  >
                    {loading ? "Importing..." : "Import Cluster"}
                  </Button>
                </div>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

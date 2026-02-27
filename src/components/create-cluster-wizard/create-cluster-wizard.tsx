"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Plus, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { importCluster } from "@/app/actions/clusters";
import { StepClusterConfig } from "./step-cluster-config";
import { StepInstallMaster } from "./step-install-master";
import { StepAddWorkers } from "./step-add-workers";
import { StepVerifyImport } from "./step-verify-import";
import { WIZARD_STEPS } from "./types";
import type { WizardFormData, MasterNodeConfig, WorkerNodeConfig } from "./types";

const initialFormData: WizardFormData = {
  clusterName: "",
  master: { ip: "", sshPort: "22", sshUser: "root" },
  nodeToken: "",
  kubeconfigYaml: "",
  workers: [],
};

const stepTitles: Record<number, { title: string; description: string }> = {
  0: {
    title: "Cluster Configuration",
    description: "Name your cluster and enter master node details.",
  },
  1: {
    title: "Install K3s Master",
    description: "Run these commands on your master node.",
  },
  2: {
    title: "Add Worker Nodes",
    description: "Optionally add worker nodes to your cluster.",
  },
  3: {
    title: "Verify & Import",
    description: "Test the connection and import your cluster.",
  },
};

export function CreateClusterWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<WizardFormData>(initialFormData);
  const [importing, setImporting] = useState(false);
  const router = useRouter();

  function resetState() {
    setStep(0);
    setDirection(1);
    setData(initialFormData);
    setImporting(false);
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) resetState();
  }

  function goNext() {
    setDirection(1);
    setStep((s) => s + 1);
  }

  function goBack() {
    setDirection(-1);
    setStep((s) => s - 1);
  }

  function canProceed(): boolean {
    switch (step) {
      case 0:
        return Boolean(data.clusterName.trim() && data.master.ip.trim());
      case 1:
        return Boolean(data.nodeToken.trim() && data.kubeconfigYaml.trim());
      case 2:
        return true; // workers are optional
      case 3:
        return Boolean(data.kubeconfigYaml.trim());
      default:
        return false;
    }
  }

  async function handleImport() {
    setImporting(true);

    const formData = new FormData();
    formData.set("kubeconfig", data.kubeconfigYaml);

    const result = await importCluster(formData);

    if (result.success) {
      toast.success("Cluster created and imported successfully!");
      setOpen(false);
      resetState();
      router.refresh();
    } else {
      toast.error(result.error || "Import failed");
    }
    setImporting(false);
  }

  const { title, description } = stepTitles[step];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 size-4" />
          Create Cluster
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 pb-2">
          {WIZARD_STEPS.map((s, i) => (
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
              {i < WIZARD_STEPS.length - 1 && (
                <div
                  className={`h-px w-8 ${i < step ? "bg-primary" : "bg-border"}`}
                />
              )}
            </div>
          ))}
        </div>

        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 * direction }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 * direction }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <StepClusterConfig
                  clusterName={data.clusterName}
                  master={data.master}
                  onClusterNameChange={(clusterName) =>
                    setData((d) => ({ ...d, clusterName }))
                  }
                  onMasterChange={(master: MasterNodeConfig) =>
                    setData((d) => ({ ...d, master }))
                  }
                />
              )}

              {step === 1 && (
                <StepInstallMaster
                  master={data.master}
                  nodeToken={data.nodeToken}
                  kubeconfigYaml={data.kubeconfigYaml}
                  onNodeTokenChange={(nodeToken) =>
                    setData((d) => ({ ...d, nodeToken }))
                  }
                  onKubeconfigChange={(kubeconfigYaml) =>
                    setData((d) => ({ ...d, kubeconfigYaml }))
                  }
                />
              )}

              {step === 2 && (
                <StepAddWorkers
                  master={data.master}
                  nodeToken={data.nodeToken}
                  workers={data.workers}
                  onWorkersChange={(workers: WorkerNodeConfig[]) =>
                    setData((d) => ({ ...d, workers }))
                  }
                />
              )}

              {step === 3 && (
                <StepVerifyImport
                  master={data.master}
                  kubeconfigYaml={data.kubeconfigYaml}
                  onKubeconfigChange={(kubeconfigYaml) =>
                    setData((d) => ({ ...d, kubeconfigYaml }))
                  }
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div>
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={goBack}>
                <ChevronLeft className="mr-1 size-3.5" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            {step < WIZARD_STEPS.length - 1 ? (
              <Button
                size="sm"
                onClick={goNext}
                disabled={!canProceed()}
              >
                Next
                <ChevronRight className="ml-1 size-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleImport}
                disabled={importing || !data.kubeconfigYaml.trim()}
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 size-3.5 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Import to Dashboard"
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

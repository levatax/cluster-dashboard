"use client";

import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeployProgressProps {
  status: "idle" | "deploying" | "deployed" | "failed";
  message?: string;
}

export function DeployProgress({ status, message }: DeployProgressProps) {
  if (status === "idle") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border p-3 text-sm",
        status === "deploying" && "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400",
        status === "deployed" && "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
        status === "failed" && "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400"
      )}
    >
      {status === "deploying" && <Loader2 className="size-4 animate-spin" />}
      {status === "deployed" && <CheckCircle2 className="size-4" />}
      {status === "failed" && <XCircle className="size-4" />}
      <span>
        {status === "deploying" && (message || "Deploying resources...")}
        {status === "deployed" && (message || "Successfully deployed")}
        {status === "failed" && (message || "Deployment failed")}
      </span>
    </div>
  );
}

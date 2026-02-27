"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, XCircle, Trash2 } from "lucide-react";

const STATUS_CONFIG = {
  deploying: { label: "Deploying", icon: Loader2, className: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400", spin: true },
  deployed: { label: "Deployed", icon: CheckCircle2, className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", spin: false },
  failed: { label: "Failed", icon: XCircle, className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400", spin: false },
  uninstalling: { label: "Removing", icon: Loader2, className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400", spin: true },
  uninstalled: { label: "Removed", icon: Trash2, className: "border-muted-foreground/30 bg-muted text-muted-foreground", spin: false },
} as const;

export function AppStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.failed;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("gap-1 text-xs", config.className)}>
      <Icon className={cn("size-3", config.spin && "animate-spin")} />
      {config.label}
    </Badge>
  );
}

"use client";

import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  HelpCircle,
  Boxes,
  Network,
  Globe,
  HardDrive,
  Clock,
  ChevronRight,
} from "lucide-react";
import type { DiscoveredApplication } from "@/lib/types";

const STATUS_CONFIG: Record<
  DiscoveredApplication["status"],
  { icon: React.ElementType; className: string }
> = {
  Healthy: { icon: CheckCircle2, className: "text-emerald-500" },
  Degraded: { icon: XCircle, className: "text-red-500" },
  Progressing: { icon: Loader2, className: "text-blue-500 animate-spin" },
  Unknown: { icon: HelpCircle, className: "text-muted-foreground" },
};

interface ApplicationCardProps {
  app: DiscoveredApplication;
  onClick: () => void;
}

export function ApplicationCard({ app, onClick }: ApplicationCardProps) {
  const { icon: StatusIcon, className: statusClass } = STATUS_CONFIG[app.status];

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <StatusIcon className={cn("size-4 shrink-0", statusClass)} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-medium text-sm truncate">{app.name}</span>
          {app.managedBy && (
            <span className="shrink-0 rounded text-[10px] px-1.5 border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400">
              {app.managedBy}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 mt-0.5 text-[11px] text-muted-foreground">
          {app.resourceCounts.deployments > 0 && (
            <span className="flex items-center gap-1">
              <Boxes className="size-3" />
              {app.resourceCounts.deployments}
            </span>
          )}
          {app.resourceCounts.services > 0 && (
            <span className="flex items-center gap-1">
              <Network className="size-3" />
              {app.resourceCounts.services}
            </span>
          )}
          {app.resourceCounts.ingresses > 0 && (
            <span className="flex items-center gap-1">
              <Globe className="size-3" />
              {app.resourceCounts.ingresses}
            </span>
          )}
          {app.resourceCounts.pvcs > 0 && (
            <span className="flex items-center gap-1">
              <HardDrive className="size-3" />
              {app.resourceCounts.pvcs}
            </span>
          )}
          {app.hosts.length > 0 && (
            <span className="font-mono text-[10px] truncate max-w-[180px]">
              {app.hosts[0]}
              {app.hosts.length > 1 ? ` +${app.hosts.length - 1}` : ""}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 text-[11px] text-muted-foreground">
        <span>
          {app.resourceCounts.pods} pod{app.resourceCounts.pods !== 1 ? "s" : ""}
        </span>
        {app.age && (
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {app.age}
          </span>
        )}
        <ChevronRight className="size-3.5" />
      </div>
    </div>
  );
}

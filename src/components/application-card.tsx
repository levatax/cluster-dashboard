"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StaggerItem } from "@/components/motion-primitives";
import type { DiscoveredApplication } from "@/lib/types";

const STATUS_COLORS: Record<DiscoveredApplication["status"], string> = {
  Healthy: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  Degraded: "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-400",
  Progressing: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400",
  Unknown: "bg-muted text-muted-foreground border-border",
};

interface ApplicationCardProps {
  app: DiscoveredApplication;
  onClick: () => void;
}

export function ApplicationCard({ app, onClick }: ApplicationCardProps) {
  const resourceParts: string[] = [];
  if (app.resourceCounts.deployments > 0) resourceParts.push(`${app.resourceCounts.deployments} Deploy`);
  if (app.resourceCounts.services > 0) resourceParts.push(`${app.resourceCounts.services} Svc`);
  if (app.resourceCounts.ingresses > 0) resourceParts.push(`${app.resourceCounts.ingresses} Ing`);
  if (app.resourceCounts.pvcs > 0) resourceParts.push(`${app.resourceCounts.pvcs} PVC`);

  return (
    <StaggerItem>
      <Card
        className="cursor-pointer transition-colors hover:bg-muted/50"
        onClick={onClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">{app.name}</h3>
              <div className="mt-1 flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {app.namespace}
                </Badge>
                {app.managedBy && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400">
                    {app.managedBy}
                  </Badge>
                )}
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn("shrink-0 text-[10px] px-1.5 py-0", STATUS_COLORS[app.status])}
            >
              {app.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {resourceParts.join(" · ")}
          </p>

          {app.hosts.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {app.hosts.map((host) => (
                <span
                  key={host}
                  className="inline-block max-w-full truncate rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                >
                  {host}
                </span>
              ))}
            </div>
          )}

          {app.images.length > 0 && (
            <p className="truncate text-[10px] text-muted-foreground/70 font-mono">
              {app.images[0].split("/").pop()?.split("@")[0]}
              {app.images.length > 1 && ` +${app.images.length - 1}`}
            </p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {app.resourceCounts.pods} pod{app.resourceCounts.pods !== 1 ? "s" : ""}
            </span>
            {app.age && (
              <span className="text-[10px] text-muted-foreground">{app.age}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </StaggerItem>
  );
}

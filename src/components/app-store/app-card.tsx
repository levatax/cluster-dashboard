"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AppCardProps {
  id: string;
  name: string;
  description: string;
  icon: string;
  version: string;
  installed?: boolean;
  onInstall: () => void;
}

export function AppCard({
  name,
  description,
  icon,
  version,
  installed,
  onInstall,
}: AppCardProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-base">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm truncate">{name}</span>
          <Badge variant="outline" className="shrink-0 text-[10px] px-1 py-0 h-4 font-normal">
            v{version}
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs truncate">{description}</p>
      </div>
      <Button
        size="sm"
        variant={installed ? "outline" : "default"}
        onClick={onInstall}
        className="h-7 text-xs shrink-0"
      >
        {installed ? "Configure" : "Install"}
      </Button>
    </div>
  );
}

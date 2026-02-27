"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, type CatalogCategory } from "@/lib/catalog/types";

interface AppCardProps {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: CatalogCategory;
  version: string;
  installed?: boolean;
  onInstall: () => void;
}

export function AppCard({
  name,
  description,
  icon,
  category,
  version,
  installed,
  onInstall,
}: AppCardProps) {
  return (
    <Card className="group overflow-hidden transition-all hover:shadow-md hover:border-primary/30">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{name}</h3>
              <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
                v{version}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">{description}</p>
            <div className="flex items-center justify-between mt-3">
              <Badge variant="secondary" className="text-[10px]">
                {CATEGORY_LABELS[category]}
              </Badge>
              <Button
                size="sm"
                variant={installed ? "outline" : "default"}
                onClick={onInstall}
                className="h-7 text-xs"
              >
                {installed ? "Configure" : "Install"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

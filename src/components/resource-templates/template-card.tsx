"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TemplateCardProps {
  id: string;
  name: string;
  kind: string;
  apiVersion: string;
  description: string;
  icon: string;
  onSelect: () => void;
}

export function TemplateCard({ name, kind, apiVersion, description, icon, onSelect }: TemplateCardProps) {
  return (
    <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30" onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">{name}</h3>
            <p className="text-muted-foreground text-xs mt-0.5">{description}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-[10px]">{kind}</Badge>
              <span className="text-[10px] text-muted-foreground">{apiVersion}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

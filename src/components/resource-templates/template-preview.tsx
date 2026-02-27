"use client";

import { ScrollArea } from "@/components/ui/scroll-area";

interface TemplatePreviewProps {
  yaml: string;
}

export function TemplatePreview({ yaml }: TemplatePreviewProps) {
  return (
    <div className="rounded-md border border-border bg-muted/50">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">YAML Preview</span>
      </div>
      <ScrollArea className="h-64">
        <pre className="p-3 text-xs font-mono whitespace-pre-wrap text-foreground/80">
          {yaml || "Fill in the form to see a preview..."}
        </pre>
      </ScrollArea>
    </div>
  );
}

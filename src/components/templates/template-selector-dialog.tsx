"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  fetchTemplatesByType,
  removeTemplate,
  type DeploymentTemplateConfig,
} from "@/app/actions/deployment-templates";
import type { DeploymentTemplateRow } from "@/lib/db";
import { Loader2, Search, FileCode2, Trash2, Lock, Calendar } from "lucide-react";
import { toast } from "sonner";

interface TemplateSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: "github" | "app_catalog";
  onSelect: (config: DeploymentTemplateConfig) => void;
}

export function TemplateSelectorDialog({
  open,
  onOpenChange,
  sourceType,
  onSelect,
}: TemplateSelectorDialogProps) {
  const [templates, setTemplates] = useState<DeploymentTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open, sourceType]);

  async function loadTemplates() {
    setLoading(true);
    const result = await fetchTemplatesByType(sourceType);
    if (result.success) {
      setTemplates(result.data);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const result = await removeTemplate(id);
    if (result.success) {
      toast.success("Template deleted");
      await loadTemplates();
    } else {
      toast.error(result.error);
    }
    setDeleting(null);
  }

  function handleSelect(template: DeploymentTemplateRow) {
    const config = template.config as unknown as DeploymentTemplateConfig;
    onSelect(config);
    onOpenChange(false);
  }

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Use Template</DialogTitle>
          <DialogDescription>
            Select a saved template to pre-fill the deployment configuration.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="max-h-[400px] -mx-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <FileCode2 className="size-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                {templates.length === 0
                  ? "No templates saved yet."
                  : "No templates match your search."}
              </p>
              {templates.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Deploy an app and save it as a template to see it here.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2 px-1">
              {filtered.map((template) => {
                const config = template.config as unknown as DeploymentTemplateConfig;
                const secretCount = config.envVars?.filter((e) => e.isSecret).length || 0;

                return (
                  <div
                    key={template.id}
                    className="group rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleSelect(template)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{template.name}</h4>
                          {secretCount > 0 && (
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              <Lock className="mr-0.5 size-2.5" />
                              {secretCount}
                            </Badge>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {template.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="font-mono">{config.name}</span>
                          <span>{config.namespace}</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            {formatDate(template.created_at)}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(template.id);
                        }}
                        disabled={deleting === template.id}
                      >
                        {deleting === template.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

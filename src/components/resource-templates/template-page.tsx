"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { TemplateCard } from "./template-card";
import { TemplateForm } from "./template-form";
import { TemplatePreview } from "./template-preview";
import { StaggerGrid, StaggerItem } from "@/components/motion-primitives";
import { fetchTemplates, createFromTemplate, previewTemplate } from "@/app/actions/templates";
import { ArrowLeft, Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import type { ResourceTemplate, FormField } from "@/lib/templates/types";

type TemplateView = Omit<ResourceTemplate, "generateYaml">;

interface TemplatePageProps {
  clusterId: string;
}

export function TemplatePage({ clusterId }: TemplatePageProps) {
  const [templates, setTemplates] = useState<TemplateView[]>([]);
  const [selected, setSelected] = useState<TemplateView | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [preview, setPreview] = useState("");
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    fetchTemplates().then((r) => {
      if (r.success) setTemplates(r.data);
    });
  }, []);

  function handleSelect(template: TemplateView) {
    setSelected(template);
    // Initialize values with defaults
    const defaults: Record<string, unknown> = {};
    template.fields.forEach((f: FormField) => {
      defaults[f.name] = f.default;
    });
    setValues(defaults);
    setPreview("");
  }

  const updatePreview = useCallback(async (templateId: string, vals: Record<string, unknown>) => {
    const result = await previewTemplate(templateId, vals);
    if (result.success) setPreview(result.data);
  }, []);

  function handleValueChange(name: string, value: unknown) {
    const newValues = { ...values, [name]: value };
    setValues(newValues);
    if (selected) {
      updatePreview(selected.id, newValues);
    }
  }

  async function handleDeploy() {
    if (!selected) return;
    setDeploying(true);
    const result = await createFromTemplate(clusterId, selected.id, values);
    if (result.success) {
      toast.success(`${selected.kind} created successfully`);
      setSelected(null);
    } else {
      toast.error(result.error);
    }
    setDeploying(false);
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
            <ArrowLeft className="mr-1 size-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{selected.icon}</span>
            <h2 className="text-lg font-semibold">Create {selected.name}</h2>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <TemplateForm
            fields={selected.fields}
            sections={selected.sections}
            values={values}
            onChange={handleValueChange}
            clusterId={clusterId}
          />
          <TemplatePreview yaml={preview} />
        </div>

        <Button onClick={handleDeploy} disabled={deploying} className="w-full">
          {deploying ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <Rocket className="mr-1.5 size-4" />
          )}
          {deploying ? "Creating..." : `Create ${selected.kind}`}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Resource Templates</h2>
        <p className="text-sm text-muted-foreground">
          Create Kubernetes resources using form-based templates
        </p>
      </div>

      {templates.length > 0 && (
        <StaggerGrid className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <StaggerItem key={t.id}>
              <TemplateCard
                id={t.id}
                name={t.name}
                kind={t.kind}
                apiVersion={t.apiVersion}
                description={t.description}
                icon={t.icon}
                onSelect={() => handleSelect(t)}
              />
            </StaggerItem>
          ))}
        </StaggerGrid>
      )}
    </div>
  );
}

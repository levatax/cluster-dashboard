"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NamespaceSelectorWithCreate } from "@/components/namespace-selector-with-create";
import type { FormField } from "@/lib/templates/types";

interface TemplateFormProps {
  fields: FormField[];
  sections: string[];
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  clusterId: string;
}

export function TemplateForm({ fields, sections, values, onChange, clusterId }: TemplateFormProps) {
  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const sectionFields = fields.filter((f) => f.section === section);
        if (sectionFields.length === 0) return null;

        // Check if any field has an unmet condition
        const visibleFields = sectionFields.filter((f) => {
          if (!f.condition) return true;
          return values[f.condition.field] === f.condition.value;
        });

        if (visibleFields.length === 0) return null;

        return (
          <div key={section}>
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
              {section}
            </h4>
            <div className="grid gap-4">
              {visibleFields.map((field) => (
                <FieldRenderer key={field.name} field={field} value={values[field.name] ?? field.default} onChange={onChange} clusterId={clusterId} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
  clusterId,
}: {
  field: FormField;
  value: unknown;
  onChange: (name: string, value: unknown) => void;
  clusterId: string;
}) {
  // Special handling for namespace fields
  if (field.name === "namespace") {
    return (
      <NamespaceSelectorWithCreate
        clusterId={clusterId}
        value={String(value)}
        onChange={(ns) => onChange(field.name, ns)}
        label={field.label}
      />
    );
  }

  switch (field.type) {
    case "select":
      return (
        <div className="grid gap-1.5">
          <Label>{field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}</Label>
          <Select value={String(value)} onValueChange={(v) => onChange(field.name, v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "textarea":
      return (
        <div className="grid gap-1.5">
          <Label>{field.label}</Label>
          <Textarea
            value={String(value || "")}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
          />
        </div>
      );

    case "toggle":
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(field.name, e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-sm">{field.label}</span>
          {field.description && <span className="text-xs text-muted-foreground">({field.description})</span>}
        </label>
      );

    case "key-value":
      return <KeyValueEditor field={field} value={value as Record<string, string> || {}} onChange={onChange} />;

    case "number":
      return (
        <div className="grid gap-1.5">
          <Label>{field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}</Label>
          <Input
            type="number"
            value={String(value)}
            onChange={(e) => onChange(field.name, Number(e.target.value))}
            min={field.min}
            max={field.max}
          />
        </div>
      );

    default:
      return (
        <div className="grid gap-1.5">
          <Label>{field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}</Label>
          <Input
            value={String(value || "")}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder}
          />
          {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
        </div>
      );
  }
}

function KeyValueEditor({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: Record<string, string>;
  onChange: (name: string, value: unknown) => void;
}) {
  const entries = Object.entries(value);

  function updateEntry(index: number, key: string, val: string) {
    const newEntries = [...entries];
    newEntries[index] = [key, val];
    onChange(field.name, Object.fromEntries(newEntries));
  }

  function addEntry() {
    onChange(field.name, { ...value, "": "" });
  }

  function removeEntry(index: number) {
    const newEntries = entries.filter((_, i) => i !== index);
    onChange(field.name, Object.fromEntries(newEntries));
  }

  return (
    <div className="grid gap-1.5">
      <Label>{field.label}</Label>
      <div className="space-y-2">
        {entries.map(([k, v], i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={k}
              onChange={(e) => updateEntry(i, e.target.value, v)}
              placeholder="Key"
              className="flex-1"
            />
            <Input
              value={v}
              onChange={(e) => updateEntry(i, k, e.target.value)}
              placeholder="Value"
              className="flex-1"
            />
            <button
              onClick={() => removeEntry(i)}
              className="text-muted-foreground hover:text-destructive px-2 text-sm"
              type="button"
            >
              x
            </button>
          </div>
        ))}
        <button
          onClick={addEntry}
          className="text-xs text-primary hover:underline"
          type="button"
        >
          + Add entry
        </button>
      </div>
    </div>
  );
}

"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NamespaceSelectorWithCreate } from "@/components/namespace-selector-with-create";
import type { ConfigField } from "@/lib/catalog/types";

interface AppConfigFormProps {
  fields: ConfigField[];
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  clusterId: string;
}

export function AppConfigForm({ fields, values, onChange, clusterId }: AppConfigFormProps) {
  return (
    <div className="grid gap-4">
      {fields.map((field) => {
        const value = values[field.name] ?? field.default;

        // Special handling for namespace fields
        if (field.name === "namespace") {
          return (
            <NamespaceSelectorWithCreate
              key={field.name}
              clusterId={clusterId}
              value={String(value)}
              onChange={(ns) => onChange(field.name, ns)}
              label={field.label}
            />
          );
        }

        return (
          <div key={field.name} className="grid gap-1.5">
            <Label htmlFor={field.name} className="text-sm">
              {field.label}
              {field.required && <span className="text-destructive ml-0.5">*</span>}
            </Label>

            {field.type === "select" ? (
              <Select
                value={String(value)}
                onValueChange={(v) => onChange(field.name, v)}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field.type === "toggle" ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => onChange(field.name, e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-sm text-muted-foreground">{field.description}</span>
              </label>
            ) : (
              <Input
                id={field.name}
                type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
                value={String(value)}
                placeholder={field.placeholder}
                min={field.min}
                max={field.max}
                onChange={(e) => {
                  const v = field.type === "number" ? Number(e.target.value) : e.target.value;
                  onChange(field.name, v);
                }}
              />
            )}

            {field.description && field.type !== "toggle" && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

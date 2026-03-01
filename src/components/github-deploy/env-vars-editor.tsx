"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ChevronDown, ChevronRight, Lock, Eye, EyeOff, ClipboardPaste } from "lucide-react";

export interface EnvVar {
  key: string;
  value: string;
  isSecret: boolean;
}

interface EnvVarsEditorProps {
  envVars: EnvVar[];
  onChange: (envVars: EnvVar[]) => void;
}

function parseEnvFile(text: string): EnvVar[] {
  const vars: EnvVar[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!key) continue;
    const isSecret = /secret|password|token|key|api_key/i.test(key);
    vars.push({ key, value, isSecret });
  }
  return vars;
}

export function EnvVarsEditor({ envVars, onChange }: EnvVarsEditorProps) {
  const [expanded, setExpanded] = useState(envVars.length > 0);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<number>>(new Set());
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");

  function addEnvVar() {
    onChange([...envVars, { key: "", value: "", isSecret: false }]);
    setExpanded(true);
  }

  function removeEnvVar(index: number) {
    onChange(envVars.filter((_, i) => i !== index));
    setVisibleSecrets((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }

  function updateEnvVar(index: number, updates: Partial<EnvVar>) {
    const updated = [...envVars];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  }

  function toggleSecretVisibility(index: number) {
    setVisibleSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function handlePasteImport() {
    const parsed = parseEnvFile(pasteText);
    if (parsed.length === 0) return;
    // Merge: overwrite existing keys, append new ones
    const merged = [...envVars];
    for (const newVar of parsed) {
      const existingIndex = merged.findIndex((e) => e.key === newVar.key);
      if (existingIndex !== -1) {
        merged[existingIndex] = newVar;
      } else {
        merged.push(newVar);
      }
    }
    onChange(merged);
    setPasteText("");
    setPasteMode(false);
    setExpanded(true);
  }

  const secretCount = envVars.filter((e) => e.isSecret).length;
  const plainCount = envVars.length - secretCount;

  return (
    <div className="rounded-lg border">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
        className="flex w-full items-center justify-between p-3 hover:bg-muted/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
          <Label className="cursor-pointer font-medium">Environment Variables</Label>
          {envVars.length > 0 && (
            <div className="flex gap-1">
              {plainCount > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {plainCount} var{plainCount !== 1 ? "s" : ""}
                </Badge>
              )}
              {secretCount > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  <Lock className="mr-0.5 size-2.5" />
                  {secretCount} secret{secretCount !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setPasteMode(!pasteMode);
              setExpanded(true);
            }}
          >
            <ClipboardPaste className="size-4 mr-1" />
            Paste .env
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              addEnvVar();
            }}
          >
            <Plus className="size-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t p-3 space-y-3">
          {pasteMode && (
            <div className="space-y-2 rounded-md border border-dashed p-3">
              <p className="text-xs text-muted-foreground">
                Paste your <code className="rounded bg-muted px-1">.env</code> file contents below. Lines with <code className="rounded bg-muted px-1">KEY=value</code> format will be parsed. Comments and empty lines are ignored.
              </p>
              <Textarea
                placeholder={"DATABASE_URL=postgres://localhost:5432/mydb\nAPI_KEY=sk-...\n# Comments are ignored"}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={6}
                className="font-mono text-sm"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {parseEnvFile(pasteText).length > 0
                    ? `${parseEnvFile(pasteText).length} variable${parseEnvFile(pasteText).length !== 1 ? "s" : ""} detected`
                    : "No variables detected yet"}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setPasteMode(false); setPasteText(""); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={parseEnvFile(pasteText).length === 0}
                    onClick={handlePasteImport}
                  >
                    Import {parseEnvFile(pasteText).length > 0 ? `${parseEnvFile(pasteText).length} variables` : ""}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {envVars.length === 0 && !pasteMode ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No environment variables defined.
            </p>
          ) : (
            <div className="space-y-2">
              {envVars.map((envVar, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      placeholder="KEY"
                      value={envVar.key}
                      onChange={(e) =>
                        updateEnvVar(index, { key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") })
                      }
                      className="font-mono text-sm"
                    />
                    <div className="relative">
                      <Input
                        placeholder="value"
                        type={envVar.isSecret && !visibleSecrets.has(index) ? "password" : "text"}
                        value={envVar.value}
                        onChange={(e) => updateEnvVar(index, { value: e.target.value })}
                        className="font-mono text-sm pr-8"
                      />
                      {envVar.isSecret && (
                        <button
                          type="button"
                          onClick={() => toggleSecretVisibility(index)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {visibleSecrets.has(index) ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                      <Checkbox
                        checked={envVar.isSecret}
                        onCheckedChange={(checked) =>
                          updateEnvVar(index, { isSecret: checked === true })
                        }
                      />
                      <Lock className="size-3" />
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeEnvVar(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {envVars.some((e) => e.isSecret) && (
            <p className="text-xs text-muted-foreground">
              <Lock className="inline size-3 mr-1" />
              Secret variables will be stored in a Kubernetes Secret and referenced via secretKeyRef.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

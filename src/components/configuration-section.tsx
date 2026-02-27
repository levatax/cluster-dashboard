"use client";

import { useState, useMemo } from "react";
import {
  Search,
  X,
  FileText,
  Lock,
  FolderOpen,
  ChevronRight,
  Clock,
  Hash,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExportDropdown } from "@/components/export-dropdown";
import { cn } from "@/lib/utils";
import type { ExportColumn } from "@/lib/export";
import type { ConfigMapInfo, SecretInfo } from "@/lib/types";

// ─── Types ─────────────────────────────────────────────────────────────────

type ResourceFilter = "all" | "configmaps" | "secrets";

type ConfigItem =
  | { kind: "configmap"; data: ConfigMapInfo }
  | { kind: "secret"; data: SecretInfo };

interface ConfigurationSectionProps {
  configMaps: ConfigMapInfo[];
  secrets: SecretInfo[];
  onSelectConfigMap: (cm: ConfigMapInfo) => void;
  onSelectSecret: (secret: SecretInfo) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const SECRET_TYPE_LABELS: Record<string, { label: string; className: string }> = {
  Opaque: {
    label: "Opaque",
    className: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  "kubernetes.io/tls": {
    label: "TLS",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  "kubernetes.io/dockerconfigjson": {
    label: "Registry",
    className: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400",
  },
  "kubernetes.io/dockercfg": {
    label: "Registry",
    className: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400",
  },
  "kubernetes.io/service-account-token": {
    label: "SA Token",
    className: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  },
  "kubernetes.io/basic-auth": {
    label: "Basic Auth",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  "kubernetes.io/ssh-auth": {
    label: "SSH",
    className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  },
  "bootstrap.kubernetes.io/token": {
    label: "Bootstrap",
    className: "border-muted-foreground/30 bg-muted text-muted-foreground",
  },
};

function getSecretTypeLabel(type: string) {
  if (SECRET_TYPE_LABELS[type]) return SECRET_TYPE_LABELS[type];
  // Shorten unknown types: "some.io/short-name" → "short-name"
  const short = type.includes("/") ? type.split("/").pop()! : type;
  return {
    label: short,
    className: "border-muted-foreground/30 bg-muted text-muted-foreground",
  };
}

const CM_EXPORT: ExportColumn<ConfigMapInfo>[] = [
  { key: "name", header: "Name" },
  { key: "namespace", header: "Namespace" },
  { key: "keyCount", header: "Keys" },
  { key: "age", header: "Age" },
];

const SECRET_EXPORT: ExportColumn<SecretInfo>[] = [
  { key: "name", header: "Name" },
  { key: "namespace", header: "Namespace" },
  { key: "type", header: "Type" },
  { key: "keyCount", header: "Keys" },
  { key: "age", header: "Age" },
];

// ─── Row components ────────────────────────────────────────────────────────

function ConfigMapRow({
  cm,
  onClick,
}: {
  cm: ConfigMapInfo;
  onClick: () => void;
}) {
  const previewKeys = cm.keys.slice(0, 4);
  const extra = cm.keys.length - previewKeys.length;

  return (
    <div
      className="group flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
        <FileText className="size-3.5 text-blue-600 dark:text-blue-400" />
      </div>

      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium truncate block">{cm.name}</span>
        {previewKeys.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-0.5">
            {previewKeys.map((k) => (
              <span
                key={k}
                className="inline-block font-mono text-[10px] px-1.5 rounded bg-muted text-muted-foreground truncate max-w-[120px]"
              >
                {k}
              </span>
            ))}
            {extra > 0 && (
              <span className="text-[10px] text-muted-foreground">+{extra} more</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 shrink-0 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Hash className="size-3" />
          {cm.keyCount}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          {cm.age}
        </span>
        <ChevronRight className="size-3.5 opacity-40" />
      </div>
    </div>
  );
}

function SecretRow({
  secret,
  onClick,
}: {
  secret: SecretInfo;
  onClick: () => void;
}) {
  const typeInfo = getSecretTypeLabel(secret.type);
  const previewKeys = secret.keys.slice(0, 3);
  const extra = secret.keys.length - previewKeys.length;

  return (
    <div
      className="group flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
        <Lock className="size-3.5 text-amber-600 dark:text-amber-400" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium truncate">{secret.name}</span>
          <span
            className={cn(
              "shrink-0 rounded text-[10px] px-1.5 border",
              typeInfo.className
            )}
          >
            {typeInfo.label}
          </span>
        </div>
        {previewKeys.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-0.5">
            {previewKeys.map((k) => (
              <span
                key={k}
                className="inline-block font-mono text-[10px] px-1.5 rounded bg-muted text-muted-foreground truncate max-w-[120px]"
              >
                {k}
              </span>
            ))}
            {extra > 0 && (
              <span className="text-[10px] text-muted-foreground">+{extra} more</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 shrink-0 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Hash className="size-3" />
          {secret.keyCount}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          {secret.age}
        </span>
        <ChevronRight className="size-3.5 opacity-40" />
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export function ConfigurationSection({
  configMaps,
  secrets,
  onSelectConfigMap,
  onSelectSecret,
}: ConfigurationSectionProps) {
  const [search, setSearch] = useState("");
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>("all");

  // Merge and filter both resource types
  const filteredCMs = useMemo(() => {
    if (resourceFilter === "secrets") return [];
    if (!search) return configMaps;
    const q = search.toLowerCase();
    return configMaps.filter(
      (cm) =>
        cm.name.toLowerCase().includes(q) ||
        cm.namespace.toLowerCase().includes(q) ||
        cm.keys.some((k) => k.toLowerCase().includes(q))
    );
  }, [configMaps, search, resourceFilter]);

  const filteredSecrets = useMemo(() => {
    if (resourceFilter === "configmaps") return [];
    if (!search) return secrets;
    const q = search.toLowerCase();
    return secrets.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.namespace.toLowerCase().includes(q) ||
        s.type.toLowerCase().includes(q) ||
        s.keys.some((k) => k.toLowerCase().includes(q))
    );
  }, [secrets, search, resourceFilter]);

  // Build namespace-grouped unified list
  const grouped = useMemo(() => {
    const groups: Record<string, ConfigItem[]> = {};

    for (const cm of filteredCMs) {
      const ns = cm.namespace || "default";
      if (!groups[ns]) groups[ns] = [];
      groups[ns].push({ kind: "configmap", data: cm });
    }
    for (const s of filteredSecrets) {
      const ns = s.namespace || "default";
      if (!groups[ns]) groups[ns] = [];
      groups[ns].push({ kind: "secret", data: s });
    }

    // Sort each namespace's items: configmaps first, then secrets, each alpha
    for (const ns of Object.keys(groups)) {
      groups[ns].sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "configmap" ? -1 : 1;
        return a.data.name.localeCompare(b.data.name);
      });
    }

    return groups;
  }, [filteredCMs, filteredSecrets]);

  const sortedNamespaces = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  const totalShown = filteredCMs.length + filteredSecrets.length;
  const totalAll = configMaps.length + secrets.length;

  const isEmpty = configMaps.length === 0 && secrets.length === 0;

  if (isEmpty) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No configuration resources found.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold">Configuration</h2>
        <p className="text-sm text-muted-foreground">ConfigMaps and Secrets in this cluster</p>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-medium">{configMaps.length} ConfigMaps</span>
        <span className="text-muted-foreground/50">·</span>
        <span className="font-medium">{secrets.length} Secrets</span>
        <span className="text-muted-foreground/50">·</span>
        <span className="text-muted-foreground">
          {new Set([...configMaps.map((c) => c.namespace), ...secrets.map((s) => s.namespace)]).size} namespace{new Set([...configMaps.map((c) => c.namespace), ...secrets.map((s) => s.namespace)]).size !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, namespace, or key name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
              onClick={() => setSearch("")}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>

        <div className="flex gap-1">
          <Button
            variant={resourceFilter === "all" ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => setResourceFilter("all")}
          >
            All ({totalAll})
          </Button>
          <Button
            variant={resourceFilter === "configmaps" ? "default" : "outline"}
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => setResourceFilter("configmaps")}
          >
            <FileText className="size-3" />
            ConfigMaps ({configMaps.length})
          </Button>
          <Button
            variant={resourceFilter === "secrets" ? "default" : "outline"}
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => setResourceFilter("secrets")}
          >
            <Lock className="size-3" />
            Secrets ({secrets.length})
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {search && totalShown !== totalAll && (
            <span className="text-xs text-muted-foreground">
              {totalShown} of {totalAll}
            </span>
          )}
          <div className="flex gap-1">
            <ExportDropdown
              data={filteredCMs}
              columns={CM_EXPORT}
              filename="configmaps"
            />
            <ExportDropdown
              data={filteredSecrets}
              columns={SECRET_EXPORT}
              filename="secrets"
            />
          </div>
        </div>
      </div>

      {/* Namespace-grouped unified list */}
      {totalShown === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No resources match your search.
        </p>
      ) : (
        <div className="space-y-4">
          {sortedNamespaces.map((ns) => (
            <div key={ns}>
              <div className="flex items-center gap-1.5 mb-2">
                <FolderOpen className="size-3.5 text-muted-foreground" />
                <h3 className="text-sm font-medium font-mono">{ns}</h3>
                <span className="text-xs text-muted-foreground">
                  ({grouped[ns].length})
                </span>
              </div>

              <div className="rounded-lg border divide-y overflow-hidden">
                {grouped[ns].map((item) =>
                  item.kind === "configmap" ? (
                    <ConfigMapRow
                      key={`cm/${item.data.namespace}/${item.data.name}`}
                      cm={item.data}
                      onClick={() => onSelectConfigMap(item.data)}
                    />
                  ) : (
                    <SecretRow
                      key={`secret/${item.data.namespace}/${item.data.name}`}
                      secret={item.data}
                      onClick={() => onSelectSecret(item.data)}
                    />
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

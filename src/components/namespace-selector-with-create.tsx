"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronsUpDown, Search, Plus, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchNamespaces, createNamespaceAction } from "@/app/actions/kubernetes";
import { toast } from "sonner";

interface NamespaceSelectorWithCreateProps {
  clusterId: string;
  value: string;
  onChange: (namespace: string) => void;
  label?: string;
  showLabel?: boolean;
}

export function NamespaceSelectorWithCreate({
  clusterId,
  value,
  onChange,
  label = "Namespace",
  showLabel = true,
}: NamespaceSelectorWithCreateProps) {
  const [open, setOpen] = useState(false);
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newNamespaceName, setNewNamespaceName] = useState("");

  const loadNamespaces = useCallback(async () => {
    setLoading(true);
    const result = await fetchNamespaces(clusterId);
    if (result.success) {
      setNamespaces(result.data);
    }
    setLoading(false);
  }, [clusterId]);

  useEffect(() => {
    loadNamespaces();
  }, [loadNamespaces]);

  const filtered = namespaces.filter((ns) =>
    ns.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = namespaces.some(
    (ns) => ns.toLowerCase() === search.toLowerCase()
  );

  async function handleCreateNamespace() {
    const name = newNamespaceName.trim().toLowerCase();
    if (!name) return;

    setCreating(true);
    const result = await createNamespaceAction(clusterId, name);
    if (result.success) {
      toast.success(`Namespace "${name}" created`);
      await loadNamespaces();
      onChange(name);
      setNewNamespaceName("");
      setShowCreateInput(false);
      setOpen(false);
    } else {
      toast.error(result.error);
    }
    setCreating(false);
  }

  async function handleQuickCreate() {
    const name = search.trim().toLowerCase();
    if (!name) return;

    setCreating(true);
    const result = await createNamespaceAction(clusterId, name);
    if (result.success) {
      toast.success(`Namespace "${name}" created`);
      await loadNamespaces();
      onChange(name);
      setSearch("");
      setOpen(false);
    } else {
      toast.error(result.error);
    }
    setCreating(false);
  }

  return (
    <div className="grid gap-1.5">
      {showLabel && <Label>{label}</Label>}
      <DropdownMenu
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            setSearch("");
            setShowCreateInput(false);
            setNewNamespaceName("");
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate">{value || "Select namespace..."}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
          <div className="p-2">
            <div className="flex items-center gap-2 rounded-md border px-2">
              <Search className="size-4 shrink-0 opacity-50" />
              <Input
                placeholder="Search or type to create..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
              />
            </div>
          </div>

          {showCreateInput ? (
            <div className="p-2 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={newNamespaceName}
                  onChange={(e) => setNewNamespaceName(e.target.value.toLowerCase())}
                  placeholder="namespace-name"
                  className="h-8 flex-1 font-mono text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateNamespace();
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleCreateNamespace}
                  disabled={creating || !newNamespaceName.trim()}
                >
                  {creating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
              </div>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowCreateInput(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setShowCreateInput(true);
                }}
                className="text-primary"
              >
                <Plus className="mr-2 size-4" />
                Create new namespace
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {!showCreateInput && (
            <ScrollArea className="max-h-[200px]">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-sm text-muted-foreground">No namespaces found</p>
                  {search && !exactMatch && (
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-1 h-auto p-0"
                      onClick={handleQuickCreate}
                      disabled={creating}
                    >
                      {creating ? (
                        <Loader2 className="mr-1 size-3 animate-spin" />
                      ) : (
                        <Plus className="mr-1 size-3" />
                      )}
                      Create &quot;{search.toLowerCase()}&quot;
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {filtered.map((ns) => (
                    <DropdownMenuItem
                      key={ns}
                      onSelect={() => {
                        onChange(ns);
                        setOpen(false);
                      }}
                    >
                      {value === ns && <Check className="mr-2 size-4" />}
                      <span className={value === ns ? "font-medium" : ""}>{ns}</span>
                    </DropdownMenuItem>
                  ))}
                  {search && !exactMatch && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={handleQuickCreate}
                        disabled={creating}
                        className="text-primary"
                      >
                        {creating ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 size-4" />
                        )}
                        Create &quot;{search.toLowerCase()}&quot;
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              )}
            </ScrollArea>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

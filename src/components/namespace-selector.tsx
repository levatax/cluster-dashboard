"use client";

import { useState } from "react";
import { ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NamespaceSelectorProps {
  namespaces: string[];
  value: string | undefined;
  onChange: (namespace: string | undefined) => void;
}

export function NamespaceSelector({
  namespaces,
  value,
  onChange,
}: NamespaceSelectorProps) {
  const [search, setSearch] = useState("");

  const filtered = namespaces.filter((ns) =>
    ns.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) setSearch("");
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="min-w-[180px] justify-between">
          <span className="truncate">{value || "All Namespaces"}</span>
          <ChevronsUpDown className="ml-1 size-3.5 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        <div className="p-1">
          <div className="flex items-center gap-2 rounded-sm border px-2">
            <Search className="size-3.5 shrink-0 opacity-50" />
            <Input
              placeholder="Search namespaces..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-[240px]">
          <DropdownMenuItem
            onSelect={() => onChange(undefined)}
            className={!value ? "font-medium" : ""}
          >
            All Namespaces
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {filtered.length === 0 ? (
            <div className="text-muted-foreground px-2 py-4 text-center text-sm">
              No namespaces found.
            </div>
          ) : (
            filtered.map((ns) => (
              <DropdownMenuItem
                key={ns}
                onSelect={() => onChange(ns)}
                className={value === ns ? "font-medium" : ""}
              >
                {ns}
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

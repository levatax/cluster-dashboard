"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Layers, GitCompareArrows } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ClusterCard } from "@/components/cluster-card";
import { FadeIn, StaggerGrid, StaggerItem } from "@/components/motion-primitives";
import { ImportDialog } from "@/components/import-dialog";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { CreateClusterWizard } from "@/components/create-cluster-wizard/create-cluster-wizard";

interface ClientCluster {
  id: string;
  name: string;
  server: string;
  created_at: string;
}

export function ClusterSearch({ clusters }: { clusters: ClientCluster[] }) {
  const [query, setQuery] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const router = useRouter();

  const filtered = useMemo(() => {
    if (!query.trim()) return clusters;
    const q = query.toLowerCase();
    return clusters.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.server.toLowerCase().includes(q)
    );
  }, [clusters, query]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  }

  function handleCompare() {
    if (selected.size >= 2) {
      router.push(`/clusters/compare?ids=${[...selected].join(",")}`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search clusters..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {clusters.length >= 2 && (
          <Button
            variant={compareMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setCompareMode((p) => !p);
              setSelected(new Set());
            }}
          >
            <GitCompareArrows className="mr-1 size-3.5" />
            Compare
          </Button>
        )}
        {compareMode && selected.size >= 2 && (
          <Button size="sm" onClick={handleCompare}>
            Compare {selected.size} Clusters
          </Button>
        )}
        {compareMode && (
          <span className="text-muted-foreground text-xs">
            Select 2-4 clusters
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <FadeIn>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
            <div className="bg-muted mb-4 flex size-12 items-center justify-center rounded-full">
              <Layers className="text-muted-foreground size-6" />
            </div>
            {query.trim() ? (
              <>
                <h3 className="mb-1 text-sm font-medium">No clusters matching &quot;{query}&quot;</h3>
                <p className="text-muted-foreground max-w-xs text-center text-sm">
                  Try a different search term.
                </p>
              </>
            ) : (
              <>
                <h3 className="mb-1 text-sm font-medium">No clusters yet</h3>
                <p className="text-muted-foreground mb-4 max-w-xs text-center text-sm">
                  Import a kubeconfig to get started managing your Kubernetes
                  clusters.
                </p>
                <div className="flex items-center gap-2">
                  <CreateClusterWizard />
                  <ImportDialog />
                  <OnboardingWizard hasClusters={false} />
                </div>
              </>
            )}
          </div>
        </FadeIn>
      ) : (
        <StaggerGrid className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cluster) => (
            <StaggerItem key={cluster.id}>
              <div className="relative">
                {compareMode && (
                  <div
                    className="absolute left-3 top-3 z-10 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelected(cluster.id);
                    }}
                  >
                    <Checkbox
                      checked={selected.has(cluster.id)}
                      onCheckedChange={() => toggleSelected(cluster.id)}
                    />
                  </div>
                )}
                <div className={compareMode && selected.has(cluster.id) ? "ring-2 ring-primary rounded-xl" : ""}>
                  <ClusterCard
                    id={cluster.id}
                    name={cluster.name}
                    server={cluster.server}
                    createdAt={cluster.created_at}
                  />
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerGrid>
      )}
    </div>
  );
}

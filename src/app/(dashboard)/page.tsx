import { getAllClusters } from "@/lib/db";
import { ImportDialog } from "@/components/import-dialog";
import { ClusterSearch } from "@/components/cluster-search";
import { PageTransition, FadeIn } from "@/components/motion-primitives";

export const dynamic = "force-dynamic";

export default async function Home() {
  const clusters = await getAllClusters();

  const clientClusters = clusters.map(({ id, name, server, created_at }) => ({
    id,
    name,
    server,
    created_at,
  }));

  return (
    <PageTransition>
      <div className="space-y-6">
        <FadeIn>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Clusters</h1>
              {clusters.length > 0 && (
                <span className="flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {clusters.length}
                </span>
              )}
            </div>
            <ImportDialog />
          </div>
        </FadeIn>

        <ClusterSearch clusters={clientClusters} />
      </div>
    </PageTransition>
  );
}

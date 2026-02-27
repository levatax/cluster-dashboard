import { redirect } from "next/navigation";
import { getClusterById } from "@/lib/db";
import {
  fetchClusterInfo,
  fetchClusterHealth,
  fetchNodes,
} from "@/app/actions/kubernetes";
import { ClusterCompare } from "@/components/cluster-compare";
import { PageTransition, FadeIn } from "@/components/motion-primitives";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ ids?: string }>;
}

export default async function ComparePage({ searchParams }: Props) {
  const { ids } = await searchParams;
  if (!ids) redirect("/");

  const clusterIds = ids.split(",").filter(Boolean).slice(0, 4);
  if (clusterIds.length < 2) redirect("/");

  // Verify all clusters exist
  const clusters = await Promise.all(
    clusterIds.map((id) => getClusterById(id))
  );
  const validCount = clusters.filter(Boolean).length;
  if (validCount < 2) redirect("/");

  // Fetch info, health, and nodes for all clusters in parallel
  const [infoResults, healthResults, nodesResults] = await Promise.all([
    Promise.all(clusterIds.map((id) => fetchClusterInfo(id))),
    Promise.all(clusterIds.map((id) => fetchClusterHealth(id))),
    Promise.all(clusterIds.map((id) => fetchNodes(id))),
  ]);

  const comparisonData = clusterIds
    .map((id, i) => ({
      id,
      cluster: clusters[i],
      info: infoResults[i],
      health: healthResults[i],
      nodes: nodesResults[i],
    }))
    .filter((x): x is typeof x & { cluster: NonNullable<typeof x.cluster> } => x.cluster !== null)
    .map((x) => ({
      id: x.id,
      name: x.cluster.name,
      server: x.cluster.server,
      info: x.info.success ? x.info.data : null,
      health: x.health.success ? x.health.data : null,
      nodes: x.nodes.success ? x.nodes.data : [],
    }));

  return (
    <PageTransition>
      <div className="space-y-6">
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Cluster Comparison
              </h1>
              <p className="text-sm text-muted-foreground">
                Comparing {comparisonData.length} clusters side by side
              </p>
            </div>
          </div>
        </FadeIn>
        <ClusterCompare data={comparisonData} />
      </div>
    </PageTransition>
  );
}

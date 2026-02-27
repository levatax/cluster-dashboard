import { notFound } from "next/navigation";
import { getClusterById } from "@/lib/db";
import { fetchClusterInfo, fetchNodes, fetchNamespaces, fetchClusterHealth } from "@/app/actions/kubernetes";
import { DeleteClusterButton } from "@/components/delete-cluster-button";
import { ClusterDetailClient } from "@/components/cluster-detail-client";
import { PageTransition, FadeIn } from "@/components/motion-primitives";
import { SetBreadcrumbName } from "@/components/set-breadcrumb-name";
import { Server } from "lucide-react";

export default async function ClusterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cluster = await getClusterById(id);

  if (!cluster) {
    notFound();
  }

  const [infoResult, nodesResult, namespacesResult, healthResult] = await Promise.all([
    fetchClusterInfo(id),
    fetchNodes(id),
    fetchNamespaces(id),
    fetchClusterHealth(id),
  ]);

  const errorMessage = !infoResult.success
    ? infoResult.error
    : !nodesResult.success
      ? nodesResult.error
      : "";

  const info = infoResult.success
    ? infoResult.data
    : {
        name: cluster.name,
        server: cluster.server,
        context: "",
        version: "N/A",
        nodeCount: 0,
        connected: false,
      };

  const nodes = nodesResult.success ? nodesResult.data : [];
  const namespaces = namespacesResult.success ? namespacesResult.data : [];
  const health = healthResult.success ? healthResult.data : undefined;

  // Strip kubeconfig_yaml before passing to client
  const clientCluster = {
    id: cluster.id,
    name: cluster.name,
    server: cluster.server,
    created_at: cluster.created_at,
    last_connected_at: cluster.last_connected_at,
    registry_url: cluster.registry_url,
  };

  return (
    <PageTransition>
      <SetBreadcrumbName name={cluster.name} />
      <div className="space-y-4">
        <FadeIn>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--gradient-from)]/20 to-[var(--gradient-to)]/20 ring-1 ring-primary/20">
                  <Server className="size-4 text-primary" />
                </div>
                <h1 className="truncate text-2xl font-bold tracking-tight">{cluster.name}</h1>
              </div>
              <p className="text-muted-foreground font-mono text-sm truncate pl-11">{cluster.server}</p>
            </div>
            <DeleteClusterButton
              clusterId={cluster.id}
              clusterName={cluster.name}
            />
          </div>
        </FadeIn>

        <ClusterDetailClient
          clusterId={id}
          cluster={clientCluster}
          initialInfo={info}
          initialNodes={nodes}
          initialNamespaces={namespaces}
          initialError={errorMessage}
          initialHealth={health}
        />
      </div>
    </PageTransition>
  );
}

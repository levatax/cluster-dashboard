import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClusterById } from "@/lib/db";
import { fetchClusterInfo, fetchNodes, fetchNamespaces, fetchClusterHealth } from "@/app/actions/kubernetes";
import { ClusterDetailClient } from "@/components/cluster-detail-client";
import { PageTransition } from "@/components/motion-primitives";
import { SetBreadcrumbName } from "@/components/set-breadcrumb-name";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const cluster = await getClusterById(id);
  return {
    title: cluster ? `${cluster.name} — K8s Dashboard` : "Cluster Not Found",
  };
}

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

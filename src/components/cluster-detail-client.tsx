"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { ClusterOverview } from "@/components/cluster-overview";
import { NodeTable } from "@/components/node-table";
import { PodTable } from "@/components/pod-table";
import { DeploymentTable } from "@/components/deployment-table";
import { ServiceTable } from "@/components/service-table";
import { IngressTable } from "@/components/ingress-table";
import { ResourceDetailSheet } from "@/components/resource-detail-sheet";
import { MonitoringTab } from "@/components/monitoring-tab";
import { PodLogViewer } from "@/components/pod-log-viewer";
import { AlertConfigDialog } from "@/components/alert-config-dialog";
import { YamlEditorSheet } from "@/components/yaml-editor-sheet";
import { CreateResourceDialog } from "@/components/create-resource-dialog";
import { CreateIngressDialog } from "@/components/create-ingress-dialog";
import { TerminalSheet } from "@/components/terminal-sheet";
import { useClusterSidebar, type InnerSidebarSection } from "@/hooks/use-cluster-sidebar";
import { AppStorePage } from "@/components/app-store/app-store-page";
import { GithubDeployPage } from "@/components/github-deploy/github-deploy-page";
import { DockerhubDeployPage } from "@/components/dockerhub-deploy/dockerhub-deploy-page";
import { TemplatePage } from "@/components/resource-templates/template-page";
import { DeployHistoryTable } from "@/components/deploy-shared/deploy-history-table";
import { StorageSection } from "@/components/storage-section";
import { ConfigurationSection } from "@/components/configuration-section";
import { HelmReleasesSection } from "@/components/helm-releases-section";
import { ApplicationsSection } from "@/components/applications-section";
import { FadeIn } from "@/components/motion-primitives";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useAlertEvaluation } from "@/hooks/use-alert-evaluation";
import { useClusterWatch, type WatchableResource } from "@/hooks/use-cluster-watch";
import {
  fetchClusterInfo,
  fetchNodes,
  fetchPods,
  fetchDeployments,
  fetchServices,
  fetchIngresses,
  fetchNodeMetrics,
  fetchEvents,
  fetchClusterHealth,
  fetchPersistentVolumes,
  fetchPersistentVolumeClaims,
  fetchStorageClasses,
  fetchConfigMaps,
  fetchSecrets,
  fetchApplications,
  fetchHelmReleases,
} from "@/app/actions/kubernetes";
import { fetchAlertConfigs } from "@/app/actions/alerts";
import type {
  ClusterInfo,
  NodeInfo,
  PodInfo,
  DeploymentInfo,
  ServiceInfo,
  IngressInfo,
  NodeMetricsInfo,
  ClusterEventInfo,
  ClusterHealthSummary,
  PersistentVolumeInfo,
  PersistentVolumeClaimInfo,
  StorageClassInfo,
  ConfigMapInfo,
  SecretInfo,
  DiscoveredApplication,
} from "@/lib/types";
import type { AlertConfig } from "@/lib/db";
import type { HelmRelease } from "@/lib/helm";

interface ClusterDetailClientProps {
  clusterId: string;
  cluster: {
    id: string;
    name: string;
    server: string;
    created_at: string;
    last_connected_at: string | null;
    registry_url: string | null;
  };
  initialInfo: ClusterInfo & { connected: boolean };
  initialNodes: NodeInfo[];
  initialNamespaces: string[];
  initialError: string;
  initialHealth?: ClusterHealthSummary;
}

const FALLBACK_POLL_INTERVAL = 60_000;

/**
 * Merge a watch event into an existing state array.
 * ADDED/MODIFIED: upsert by key. DELETED: remove by key. SNAPSHOT: replace all.
 */
function applyResourceUpdate<T extends { name: string; namespace?: string }>(
  items: T[],
  action: string,
  data: T | T[]
): T[] {
  if (action === "SNAPSHOT") {
    return Array.isArray(data) ? data : items;
  }

  const item = data as T;
  const key = (i: T) => ("namespace" in i && i.namespace ? `${i.namespace}/${i.name}` : i.name);
  const itemKey = key(item);

  if (action === "DELETED") {
    return items.filter((i) => key(i) !== itemKey);
  }

  // ADDED or MODIFIED — upsert
  const idx = items.findIndex((i) => key(i) === itemKey);
  if (idx >= 0) {
    const next = [...items];
    next[idx] = item;
    return next;
  }
  return [...items, item];
}

// Sections that need namespace filtering
const RESOURCE_SECTIONS: InnerSidebarSection[] = ["applications", "pods", "deployments", "services", "configuration", "storage", "helm-releases", "monitoring"];

export function ClusterDetailClient({
  clusterId,
  cluster,
  initialInfo,
  initialNodes,
  initialNamespaces,
  initialError,
  initialHealth,
}: ClusterDetailClientProps) {
  const [info, setInfo] = useState(initialInfo);
  const [nodes, setNodes] = useState(initialNodes);
  const [error, setError] = useState(initialError);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Section state from sidebar context
  const { activeSection, setActiveSection, setConnected, setCounts } = useClusterSidebar();

  // Namespace state
  const [namespaces] = useState<string[]>(initialNamespaces);
  const [namespace, setNamespace] = useState<string | undefined>(undefined);

  // Resource state
  const [pods, setPods] = useState<PodInfo[]>([]);
  const [deployments, setDeployments] = useState<DeploymentInfo[]>([]);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [ingresses, setIngresses] = useState<IngressInfo[]>([]);

  // Applications state
  const [applications, setApplications] = useState<DiscoveredApplication[]>([]);

  // Storage state
  const [pvs, setPvs] = useState<PersistentVolumeInfo[]>([]);
  const [pvcs, setPvcs] = useState<PersistentVolumeClaimInfo[]>([]);
  const [storageClasses, setStorageClasses] = useState<StorageClassInfo[]>([]);

  // Configuration state
  const [configMaps, setConfigMaps] = useState<ConfigMapInfo[]>([]);
  const [secrets, setSecrets] = useState<SecretInfo[]>([]);

  // Helm releases state
  const [helmReleases, setHelmReleases] = useState<HelmRelease[]>([]);

  // Monitoring state
  const [health, setHealth] = useState<ClusterHealthSummary | undefined>(initialHealth);
  const [nodeMetrics, setNodeMetrics] = useState<NodeMetricsInfo[]>([]);
  const [events, setEvents] = useState<ClusterEventInfo[]>([]);
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([]);
  const [monitoringFilter, setMonitoringFilter] = useState<"all" | "Normal" | "Warning">("all");

  // Log viewer state
  const [logViewerOpen, setLogViewerOpen] = useState(false);
  const [logPod, setLogPod] = useState<PodInfo | null>(null);

  // Alert config dialog state
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);

  // YAML editor state
  const [yamlEditorOpen, setYamlEditorOpen] = useState(false);
  const [yamlEditorMeta, setYamlEditorMeta] = useState<{
    apiVersion: string;
    kind: string;
    name: string;
    namespace: string;
  } | null>(null);

  // Create resource dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Create ingress dialog state
  const [createIngressOpen, setCreateIngressOpen] = useState(false);

  // Terminal state
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalPod, setTerminalPod] = useState<PodInfo | null>(null);

  // Track which resource sections have been loaded
  const loadedRef = useRef<Set<string>>(new Set());

  // Detail sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<"pod" | "deployment" | "service" | "ingress" | "configmap" | "secret" | null>(null);
  const [sheetResource, setSheetResource] = useState<PodInfo | DeploymentInfo | ServiceInfo | IngressInfo | ConfigMapInfo | SecretInfo | null>(null);

  // Evaluate alerts
  const activeAlerts = useAlertEvaluation(nodeMetrics, alertConfigs);

  // Section keyboard shortcuts (1-9 keys)
  const sectionKeys: InnerSidebarSection[] = useMemo(
    () => ["overview", "nodes", "monitoring", "pods", "deployments", "services", "storage", "app-store"],
    []
  );

  useHotkeys(
    useMemo(
      () => [
        ...sectionKeys.map((section, i) => ({
          key: String(i + 1),
          callback: () => handleSectionChange(section),
        })),
        {
          key: "r",
          callback: () => {
            if (!isRefreshing) refresh();
          },
        },
        {
          key: "p",
          callback: () => setIsPaused((p) => !p),
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [sectionKeys, isRefreshing]
    )
  );

  // Sync connected status to sidebar context
  useEffect(() => {
    setConnected(info.connected);
  }, [info.connected, setConnected]);

  // Sync counts to sidebar context
  useEffect(() => {
    setCounts({
      nodes: info.connected ? nodes.length : undefined,
      applications: applications.length > 0 ? applications.length : undefined,
      pods: pods.length > 0 ? pods.length : undefined,
      deployments: deployments.length > 0 ? deployments.length : undefined,
      services: services.length + ingresses.length > 0 ? services.length + ingresses.length : undefined,
      configuration: configMaps.length + secrets.length > 0 ? configMaps.length + secrets.length : undefined,
      storage: pvcs.length > 0 ? pvcs.length : undefined,
      helmReleases: helmReleases.length > 0 ? helmReleases.length : undefined,
      alerts: activeAlerts.length > 0 ? activeAlerts.length : undefined,
      alertLevel: activeAlerts.some((a) => a.level === "critical") ? "critical" : activeAlerts.length > 0 ? "warning" : undefined,
    });
  }, [info.connected, nodes.length, applications.length, pods.length, deployments.length, services.length, ingresses.length, configMaps.length, secrets.length, pvcs.length, helmReleases.length, activeAlerts, setCounts]);

  // Reset section to overview when cluster changes
  useEffect(() => {
    setActiveSection("overview");
    loadedRef.current.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterId]);

  // Load alert configs on mount
  useEffect(() => {
    fetchAlertConfigs(clusterId).then((r) => {
      if (r.success) setAlertConfigs(r.data);
    });
  }, [clusterId]);

  // Try to load node metrics on mount
  useEffect(() => {
    fetchNodeMetrics(clusterId).then((r) => {
      if (r.success) setNodeMetrics(r.data);
    });
  }, [clusterId]);

  const fetchResourceTab = useCallback(
    async (tab: string, ns?: string) => {
      if (tab === "applications") {
        const result = await fetchApplications(clusterId, ns);
        if (result.success) setApplications(result.data);
      } else if (tab === "pods") {
        const result = await fetchPods(clusterId, ns);
        if (result.success) setPods(result.data);
      } else if (tab === "deployments") {
        const result = await fetchDeployments(clusterId, ns);
        if (result.success) setDeployments(result.data);
      } else if (tab === "services") {
        const [svcResult, ingResult] = await Promise.all([
          fetchServices(clusterId, ns),
          fetchIngresses(clusterId, ns),
        ]);
        if (svcResult.success) setServices(svcResult.data);
        if (ingResult.success) setIngresses(ingResult.data);
      } else if (tab === "configuration") {
        const [cmResult, secretResult] = await Promise.all([
          fetchConfigMaps(clusterId, ns),
          fetchSecrets(clusterId, ns),
        ]);
        if (cmResult.success) setConfigMaps(cmResult.data);
        if (secretResult.success) setSecrets(secretResult.data);
      } else if (tab === "storage") {
        const [pvResult, pvcResult, scResult] = await Promise.all([
          fetchPersistentVolumes(clusterId),
          fetchPersistentVolumeClaims(clusterId, ns),
          fetchStorageClasses(clusterId),
        ]);
        if (pvResult.success) setPvs(pvResult.data);
        if (pvcResult.success) setPvcs(pvcResult.data);
        if (scResult.success) setStorageClasses(scResult.data);
      } else if (tab === "helm-releases") {
        const result = await fetchHelmReleases(clusterId, ns);
        if (result.success) setHelmReleases(result.data);
      } else if (tab === "monitoring") {
        const result = await fetchEvents(clusterId, ns);
        if (result.success) setEvents(result.data);
      }
    },
    [clusterId]
  );

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [infoResult, nodesResult, healthResult, metricsResult] = await Promise.all([
        fetchClusterInfo(clusterId),
        fetchNodes(clusterId),
        fetchClusterHealth(clusterId),
        fetchNodeMetrics(clusterId),
      ]);

      if (infoResult.success) setInfo(infoResult.data);
      if (nodesResult.success) setNodes(nodesResult.data);
      if (healthResult.success) setHealth(healthResult.data);
      if (metricsResult.success) setNodeMetrics(metricsResult.data);

      const newError = !infoResult.success
        ? infoResult.error
        : !nodesResult.success
          ? nodesResult.error
          : "";
      setError(newError);

      // Also refresh the active resource section
      if (RESOURCE_SECTIONS.includes(activeSection)) {
        await fetchResourceTab(activeSection, namespace);
      }

      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [clusterId, activeSection, namespace, fetchResourceTab]);

  // --- Real-time watch ---
  // Determine which resources to watch based on active section
  const watchResources = useMemo<WatchableResource[]>(() => {
    // pods and deployments are always watched — health cards on overview need their counts
    return ["nodes", "events", "pods", "deployments"];
  }, []);

  const watchState = useClusterWatch(
    clusterId,
    watchResources,
    {
      onNode: (action, data) => {
        setNodes((prev) => applyResourceUpdate(prev, action, data));
        setLastUpdated(new Date());
      },
      onPod: (action, data) => {
        setPods((prev) => applyResourceUpdate(prev, action, data));
        setLastUpdated(new Date());
      },
      onDeployment: (action, data) => {
        setDeployments((prev) => applyResourceUpdate(prev, action, data));
        setLastUpdated(new Date());
      },
      onEvent: (action, data) => {
        setEvents((prev) => {
          const updated = applyResourceUpdate(prev, action, data);
          // Keep events sorted by timestamp and capped at 200
          return updated
            .sort((a, b) => {
              const ta = a.lastTimestamp || a.firstTimestamp || "";
              const tb = b.lastTimestamp || b.firstTimestamp || "";
              return tb.localeCompare(ta);
            })
            .slice(0, 200);
        });
        setLastUpdated(new Date());
      },
      onHealth: (data) => {
        setHealth(data);
        setLastUpdated(new Date());
      },
    },
    { namespace, enabled: !isPaused && info.connected }
  );

  // Fallback polling — only when watch is disconnected
  useEffect(() => {
    if (isPaused || watchState.connected) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(refresh, FALLBACK_POLL_INTERVAL);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPaused, watchState.connected, refresh]);

  // Lazy load resource data when section changes (triggered by sidebar context)
  const prevSectionRef = useRef(activeSection);
  useEffect(() => {
    if (prevSectionRef.current !== activeSection) {
      prevSectionRef.current = activeSection;
      if (RESOURCE_SECTIONS.includes(activeSection) && !loadedRef.current.has(`${activeSection}:${namespace ?? ""}`)) {
        loadedRef.current.add(`${activeSection}:${namespace ?? ""}`);
        fetchResourceTab(activeSection, namespace);
      }
    }
  }, [activeSection, namespace, fetchResourceTab]);

  const handleSectionChange = useCallback(
    (section: InnerSidebarSection) => {
      if (section === "monitoring") setMonitoringFilter("all");
      setActiveSection(section);
    },
    [setActiveSection]
  );

  const handleOverviewNavigate = useCallback(
    (section: InnerSidebarSection, filter?: "Warning") => {
      if (section === "monitoring") setMonitoringFilter(filter ?? "all");
      setActiveSection(section);
    },
    [setActiveSection]
  );

  // Re-fetch when namespace changes
  const handleNamespaceChange = useCallback(
    (ns: string | undefined) => {
      setNamespace(ns);
      loadedRef.current.clear();
      if (RESOURCE_SECTIONS.includes(activeSection)) {
        loadedRef.current.add(`${activeSection}:${ns ?? ""}`);
        fetchResourceTab(activeSection, ns);
      }
    },
    [activeSection, fetchResourceTab]
  );

  function openDetail(
    type: "pod" | "deployment" | "service" | "ingress" | "configmap" | "secret",
    resource: PodInfo | DeploymentInfo | ServiceInfo | IngressInfo | ConfigMapInfo | SecretInfo
  ) {
    setSheetType(type);
    setSheetResource(resource);
    setSheetOpen(true);
  }

  function handleViewLogs(pod: PodInfo) {
    setLogPod(pod);
    setSheetOpen(false);
    setLogViewerOpen(true);
  }

  function handleEditYaml(apiVersion: string, kind: string, name: string, ns: string) {
    setYamlEditorMeta({ apiVersion, kind, name, namespace: ns });
    setSheetOpen(false);
    setYamlEditorOpen(true);
  }

  function handleOpenTerminal(pod: PodInfo) {
    setTerminalPod(pod);
    setSheetOpen(false);
    setTerminalOpen(true);
  }

  function handleAlertConfigSaved() {
    fetchAlertConfigs(clusterId).then((r) => {
      if (r.success) setAlertConfigs(r.data);
    });
  }

  function handleMutationRefresh() {
    loadedRef.current.clear();
    refresh();
  }

  const hasError = !!error;

  // Render the active section content
  function renderContent() {
    switch (activeSection) {
      case "overview":
        return <ClusterOverview info={info} cluster={cluster} health={health} onNavigate={handleOverviewNavigate} />;

      case "nodes":
        return info.connected ? (
          <NodeTable
            nodes={nodes}
            metrics={nodeMetrics}
            pods={pods}
            clusterId={clusterId}
            onRefresh={handleMutationRefresh}
            onSelectPod={(p) => openDetail("pod", p)}
          />
        ) : (
          <p className="text-muted-foreground py-8 text-center">
            Cannot fetch nodes — cluster is disconnected.
          </p>
        );

      case "monitoring":
        return info.connected ? (
          <MonitoringTab
            events={events}
            alerts={activeAlerts}
            onConfigureAlerts={() => setAlertDialogOpen(true)}
            initialTypeFilter={monitoringFilter}
          />
        ) : (
          <p className="text-muted-foreground py-8 text-center">
            Cannot fetch monitoring data — cluster is disconnected.
          </p>
        );

      case "applications":
        return info.connected ? (
          <ApplicationsSection
            applications={applications}
            clusterId={clusterId}
            onRefresh={handleMutationRefresh}
          />
        ) : (
          <p className="text-muted-foreground py-8 text-center">
            Cannot fetch applications — cluster is disconnected.
          </p>
        );

      case "pods":
        return info.connected ? (
          <PodTable
            pods={pods}
            onSelect={(p) => openDetail("pod", p)}
            onViewLogs={handleViewLogs}
            onOpenTerminal={handleOpenTerminal}
          />
        ) : (
          <p className="text-muted-foreground py-8 text-center">
            Cannot fetch pods — cluster is disconnected.
          </p>
        );

      case "deployments":
        return info.connected ? (
          <DeploymentTable
            deployments={deployments}
            onSelect={(d) => openDetail("deployment", d)}
            clusterId={clusterId}
            onRefresh={handleMutationRefresh}
          />
        ) : (
          <p className="text-muted-foreground py-8 text-center">
            Cannot fetch deployments — cluster is disconnected.
          </p>
        );

      case "services":
        return info.connected ? (
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h2 className="text-base font-semibold">Services & Ingress</h2>
              <p className="text-sm text-muted-foreground">Internal and external network endpoints for this cluster</p>
            </div>

            {/* Ingresses section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Ingresses</h3>
                  <p className="text-muted-foreground text-xs mt-0.5">HTTP/S routing rules for external access</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary/30 text-primary hover:bg-primary/5"
                  onClick={() => setCreateIngressOpen(true)}
                >
                  <Plus className="mr-1 size-3.5" />
                  Add Ingress
                </Button>
              </div>
              <IngressTable
                ingresses={ingresses}
                onSelect={(i) => openDetail("ingress", i)}
              />
            </div>

            <div className="border-t" />

            {/* Services section */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Services</h3>
                <p className="text-muted-foreground text-xs mt-0.5">Internal and external network endpoints</p>
              </div>
              <ServiceTable
                services={services}
                onSelect={(s) => openDetail("service", s)}
              />
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground py-8 text-center">
            Cannot fetch services — cluster is disconnected.
          </p>
        );

      case "configuration":
        return info.connected ? (
          <ConfigurationSection
            configMaps={configMaps}
            secrets={secrets}
            onSelectConfigMap={(cm) => openDetail("configmap", cm)}
            onSelectSecret={(s) => openDetail("secret", s)}
          />
        ) : (
          <p className="text-muted-foreground py-8 text-center">
            Cannot fetch configuration — cluster is disconnected.
          </p>
        );

      case "storage":
        return info.connected ? (
          <StorageSection
            pvs={pvs}
            pvcs={pvcs}
            storageClasses={storageClasses}
          />
        ) : (
          <p className="text-muted-foreground py-8 text-center">
            Cannot fetch storage — cluster is disconnected.
          </p>
        );

      case "helm-releases":
        return info.connected ? (
          <HelmReleasesSection
            releases={helmReleases}
            clusterId={clusterId}
            onRefresh={handleMutationRefresh}
          />
        ) : (
          <p className="text-muted-foreground py-8 text-center">
            Cannot fetch Helm releases — cluster is disconnected.
          </p>
        );

      case "app-store":
        return <AppStorePage clusterId={clusterId} />;

      case "github-deploy":
        return <GithubDeployPage clusterId={clusterId} />;

      case "dockerhub-deploy":
        return <DockerhubDeployPage clusterId={clusterId} />;

      case "templates":
        return <TemplatePage clusterId={clusterId} />;

      case "deploy-history":
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Deployment History</h2>
              <p className="text-sm text-muted-foreground">
                Track all deployments, installations, and resource creations
              </p>
            </div>
            <DeployHistoryTable clusterId={clusterId} />
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <>
      {hasError && (
        <FadeIn delay={0.05}>
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </FadeIn>
      )}

      <FadeIn delay={0.1}>
        <div>{renderContent()}</div>
      </FadeIn>

      <ResourceDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        type={sheetType}
        resource={sheetResource}
        clusterId={clusterId}
        onViewLogs={handleViewLogs}
        onRefresh={handleMutationRefresh}
        onEditYaml={handleEditYaml}
        onOpenTerminal={handleOpenTerminal}
      />

      {logPod && (
        <PodLogViewer
          open={logViewerOpen}
          onOpenChange={setLogViewerOpen}
          clusterId={clusterId}
          namespace={logPod.namespace}
          pod={logPod.name}
          containers={logPod.containers.map((c) => c.name)}
        />
      )}

      {alertDialogOpen && (
        <AlertConfigDialog
          open={alertDialogOpen}
          onOpenChange={setAlertDialogOpen}
          clusterId={clusterId}
          alertConfigs={alertConfigs}
          onSaved={handleAlertConfigSaved}
        />
      )}

      {yamlEditorMeta && (
        <YamlEditorSheet
          open={yamlEditorOpen}
          onOpenChange={setYamlEditorOpen}
          clusterId={clusterId}
          apiVersion={yamlEditorMeta.apiVersion}
          kind={yamlEditorMeta.kind}
          name={yamlEditorMeta.name}
          namespace={yamlEditorMeta.namespace}
          onSuccess={handleMutationRefresh}
        />
      )}

      <CreateResourceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        clusterId={clusterId}
        onSuccess={handleMutationRefresh}
      />

      <CreateIngressDialog
        open={createIngressOpen}
        onOpenChange={setCreateIngressOpen}
        clusterId={clusterId}
        namespace={namespace}
        onSuccess={() => {
          handleMutationRefresh();
        }}
      />

      {terminalPod && (
        <TerminalSheet
          open={terminalOpen}
          onOpenChange={setTerminalOpen}
          clusterId={clusterId}
          namespace={terminalPod.namespace}
          pod={terminalPod.name}
          containers={terminalPod.containers.map((c) => c.name)}
        />
      )}
    </>
  );
}


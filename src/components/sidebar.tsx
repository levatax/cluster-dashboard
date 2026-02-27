"use client";

import { useParams, useRouter } from "next/navigation";
import {
  ChevronsUpDown,
  Check,
  Server,
  Layers,
  LayoutDashboard,
  Activity,
  Box,
  Rocket,
  Globe,
  HardDrive,
  ScrollText,
  Store,
  GitBranch,
  History,
  FileCode,
  Container,
  Anchor,
  Home,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useClusterSidebar, type InnerSidebarSection } from "@/hooks/use-cluster-sidebar";

interface NavItem {
  id: InnerSidebarSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  badge?: number;
  badgeVariant?: "default" | "warning" | "critical";
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface AppSidebarProps {
  clusters: { id: string; name: string }[];
}

export function AppSidebar({ clusters }: AppSidebarProps) {
  const params = useParams();
  const router = useRouter();
  const { activeSection, setActiveSection, connected, counts } = useClusterSidebar();

  const currentClusterId = params?.id as string | undefined;
  const currentCluster = clusters.find((c) => c.id === currentClusterId);

  const groups: NavGroup[] = [
    {
      title: "Cluster",
      items: [
        { id: "overview", label: "Overview", icon: LayoutDashboard },
        {
          id: "nodes",
          label: "Nodes",
          icon: Server,
          badge: counts?.nodes,
        },
        {
          id: "monitoring",
          label: "Monitoring",
          icon: Activity,
          disabled: !connected,
          badge: counts?.alerts,
          badgeVariant: counts?.alertLevel,
        },
      ],
    },
    {
      title: "Workloads",
      items: [
        {
          id: "applications",
          label: "Applications",
          icon: Layers,
          disabled: !connected,
          badge: counts?.applications,
        },
        {
          id: "pods",
          label: "Pods",
          icon: Box,
          disabled: !connected,
          badge: counts?.pods,
        },
        {
          id: "deployments",
          label: "Deployments",
          icon: Rocket,
          disabled: !connected,
          badge: counts?.deployments,
        },
        {
          id: "services",
          label: "Services & Ingress",
          icon: Globe,
          disabled: !connected,
          badge: counts?.services,
        },
        {
          id: "storage",
          label: "Storage",
          icon: HardDrive,
          disabled: !connected,
          badge: counts?.storage,
        },
        {
          id: "helm-releases",
          label: "Helm Releases",
          icon: Anchor,
          disabled: !connected,
          badge: counts?.helmReleases,
        },
        {
          id: "logs",
          label: "Logs",
          icon: ScrollText,
          disabled: !connected,
        },
      ],
    },
    {
      title: "Deploy & Install",
      items: [
        { id: "app-store", label: "App Store", icon: Store },
        { id: "github-deploy", label: "GitHub", icon: GitBranch },
        { id: "dockerhub-deploy", label: "Docker Hub", icon: Container },
        { id: "templates", label: "Templates", icon: FileCode },
        { id: "deploy-history", label: "History", icon: History },
      ],
    },
  ];

  function handleClusterSelect(clusterId: string) {
    setActiveSection("overview");
    router.push(`/clusters/${clusterId}`);
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={currentCluster?.name ?? "Select cluster"}
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--gradient-from)] to-[var(--gradient-to)] shadow-sm">
                    {currentCluster ? (
                      <Server className="size-4 text-white" />
                    ) : (
                      <Layers className="size-4 text-white" />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="truncate font-semibold">
                      {currentCluster?.name ?? "K8s Dashboard"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {currentCluster ? "Cluster" : "Select cluster"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Clusters
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {clusters.length === 0 ? (
                  <DropdownMenuItem disabled>
                    <span className="text-muted-foreground">No clusters imported</span>
                  </DropdownMenuItem>
                ) : (
                  clusters.map((cluster) => (
                    <DropdownMenuItem
                      key={cluster.id}
                      onClick={() => handleClusterSelect(cluster.id)}
                    >
                      <Server className="mr-2 size-4 shrink-0" />
                      <span className="truncate">{cluster.name}</span>
                      {cluster.id === currentClusterId && (
                        <Check className="ml-auto size-4 shrink-0" />
                      )}
                    </DropdownMenuItem>
                  ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/")}>
                  <Home className="mr-2 size-4 shrink-0" />
                  <span>All Clusters</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {currentCluster && (
        <>
          <SidebarSeparator />
          <SidebarContent>
            {groups.map((group) => (
              <SidebarGroup key={group.title}>
                <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  {group.title}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            isActive={activeSection === item.id}
                            disabled={item.disabled}
                            tooltip={item.label}
                            onClick={() =>
                              !item.disabled && setActiveSection(item.id)
                            }
                          >
                            <Icon className="size-4" />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                          {item.badge != null && item.badge > 0 && (
                            <SidebarMenuBadge
                              className={cn(
                                item.badgeVariant === "critical" &&
                                  "text-red-700 dark:text-red-400",
                                item.badgeVariant === "warning" &&
                                  "text-yellow-700 dark:text-yellow-400"
                              )}
                            >
                              {item.badge}
                            </SidebarMenuBadge>
                          )}
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
        </>
      )}

      <SidebarRail />
    </Sidebar>
  );
}

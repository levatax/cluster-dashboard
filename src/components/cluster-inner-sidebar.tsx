"use client";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  LayoutDashboard,
  Server,
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
  Layers,
  Anchor,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export type InnerSidebarSection =
  | "overview"
  | "nodes"
  | "monitoring"
  | "applications"
  | "pods"
  | "deployments"
  | "services"
  | "storage"
  | "helm-releases"
  | "logs"
  | "app-store"
  | "github-deploy"
  | "dockerhub-deploy"
  | "templates"
  | "deploy-history";

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

interface ClusterInnerSidebarProps {
  activeSection: InnerSidebarSection;
  onSectionChange: (section: InnerSidebarSection) => void;
  connected: boolean;
  counts?: {
    nodes?: number;
    applications?: number;
    pods?: number;
    deployments?: number;
    services?: number;
    storage?: number;
    helmReleases?: number;
    alerts?: number;
    alertLevel?: "warning" | "critical";
  };
}

export function ClusterInnerSidebar({
  activeSection,
  onSectionChange,
  connected,
  counts,
}: ClusterInnerSidebarProps) {
  const isMobile = useIsMobile();

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

  if (isMobile) {
    // Horizontal scrollable pill bar on mobile
    const allItems = groups.flatMap((g) => g.items);
    return (
      <div className="flex gap-1 overflow-x-auto scroll-smooth pb-2 scrollbar-none -mx-1 px-1">
        {allItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => !item.disabled && onSectionChange(item.id)}
              disabled={item.disabled}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
                item.disabled && "opacity-40 cursor-not-allowed"
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
              {item.badge != null && item.badge > 0 && (
                <span className="ml-0.5 text-[10px]">({item.badge})</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Desktop: vertical sidebar
  return (
    <div className="w-52 shrink-0 border-r border-border">
      <ScrollArea className="h-full">
        <nav className="flex flex-col gap-1 p-3">
          {groups.map((group) => (
            <div key={group.title} className="mb-2">
              <span className="mb-1 block px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.title}
              </span>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => !item.disabled && onSectionChange(item.id)}
                    disabled={item.disabled}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      item.disabled && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {item.badge != null && item.badge > 0 && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "ml-auto text-[10px] px-1 py-0",
                          item.badgeVariant === "critical"
                            ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
                            : item.badgeVariant === "warning"
                              ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                              : "border-border"
                        )}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );
}

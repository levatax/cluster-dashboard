"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

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

export interface SidebarCounts {
  nodes?: number;
  applications?: number;
  pods?: number;
  deployments?: number;
  services?: number;
  storage?: number;
  helmReleases?: number;
  alerts?: number;
  alertLevel?: "warning" | "critical";
}

interface ClusterSidebarContextType {
  activeSection: InnerSidebarSection;
  setActiveSection: (section: InnerSidebarSection) => void;
  connected: boolean;
  setConnected: (connected: boolean) => void;
  counts: SidebarCounts;
  setCounts: (counts: SidebarCounts) => void;
}

const ClusterSidebarContext = createContext<ClusterSidebarContextType | null>(null);

export function ClusterSidebarProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSection] = useState<InnerSidebarSection>("overview");
  const [connected, setConnected] = useState(false);
  const [counts, setCounts] = useState<SidebarCounts>({});

  return (
    <ClusterSidebarContext.Provider
      value={{
        activeSection,
        setActiveSection,
        connected,
        setConnected,
        counts,
        setCounts,
      }}
    >
      {children}
    </ClusterSidebarContext.Provider>
  );
}

export function useClusterSidebar() {
  const ctx = useContext(ClusterSidebarContext);
  if (!ctx) throw new Error("useClusterSidebar must be used within ClusterSidebarProvider");
  return ctx;
}

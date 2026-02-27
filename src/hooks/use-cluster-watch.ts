"use client";

import { useState, useEffect, useRef } from "react";
import type {
  NodeInfo,
  PodInfo,
  DeploymentInfo,
  ClusterEventInfo,
  ClusterHealthSummary,
} from "@/lib/types";

export type WatchableResource = "nodes" | "pods" | "deployments" | "events";
type WatchAction = "ADDED" | "MODIFIED" | "DELETED" | "SNAPSHOT";

interface WatchHandlers {
  onNode?: (action: WatchAction, data: NodeInfo | NodeInfo[]) => void;
  onPod?: (action: WatchAction, data: PodInfo | PodInfo[]) => void;
  onDeployment?: (action: WatchAction, data: DeploymentInfo | DeploymentInfo[]) => void;
  onEvent?: (action: WatchAction, data: ClusterEventInfo | ClusterEventInfo[]) => void;
  onHealth?: (data: ClusterHealthSummary) => void;
}

interface WatchOptions {
  namespace?: string;
  enabled?: boolean;
}

interface WatchState {
  connected: boolean;
  watching: WatchableResource[];
  error: string | null;
}

const MIN_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;

export function useClusterWatch(
  clusterId: string,
  resources: WatchableResource[],
  handlers: WatchHandlers,
  options?: WatchOptions
): WatchState {
  const { namespace, enabled = true } = options ?? {};

  const [state, setState] = useState<WatchState>({
    connected: false,
    watching: [],
    error: null,
  });

  // Store handlers in ref to avoid reconnecting on handler identity changes
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Stable resource key for dependency tracking
  const resourcesKey = resources.slice().sort().join(",");

  const backoffRef = useRef(MIN_BACKOFF_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const mountedRef = useRef(true);

  function cleanup() {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled || !clusterId || resources.length === 0) {
      cleanup();
      setState({ connected: false, watching: [], error: null });
      return;
    }

    function connect() {
      cleanup();

      const params = new URLSearchParams();
      params.set("resources", resourcesKey);
      if (namespace) params.set("namespace", namespace);

      const url = `/api/clusters/${clusterId}/watch?${params.toString()}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.addEventListener("status", (e) => {
        try {
          const data = JSON.parse(e.data) as {
            watching: WatchableResource[];
            connected: boolean;
            error?: string;
          };
          setState({
            connected: data.connected,
            watching: data.watching,
            error: data.error || null,
          });
          if (data.connected) {
            backoffRef.current = MIN_BACKOFF_MS;
          }
        } catch { /* ignore parse errors */ }
      });

      es.addEventListener("ping", () => {
        // Keepalive — no action needed, just confirms connection is alive
      });

      // Singular resource events (individual updates)
      es.addEventListener("node", (e) => {
        try {
          const { action, resource } = JSON.parse(e.data);
          handlersRef.current.onNode?.(action, resource);
        } catch { /* ignore */ }
      });

      es.addEventListener("pod", (e) => {
        try {
          const { action, resource } = JSON.parse(e.data);
          handlersRef.current.onPod?.(action, resource);
        } catch { /* ignore */ }
      });

      es.addEventListener("deployment", (e) => {
        try {
          const { action, resource } = JSON.parse(e.data);
          handlersRef.current.onDeployment?.(action, resource);
        } catch { /* ignore */ }
      });

      es.addEventListener("event", (e) => {
        try {
          const { action, resource } = JSON.parse(e.data);
          handlersRef.current.onEvent?.(action, resource);
        } catch { /* ignore */ }
      });

      // Plural resource events (snapshots — arrays)
      es.addEventListener("nodes", (e) => {
        try {
          const { action, resource } = JSON.parse(e.data);
          handlersRef.current.onNode?.(action, resource);
        } catch { /* ignore */ }
      });

      es.addEventListener("pods", (e) => {
        try {
          const { action, resource } = JSON.parse(e.data);
          handlersRef.current.onPod?.(action, resource);
        } catch { /* ignore */ }
      });

      es.addEventListener("deployments", (e) => {
        try {
          const { action, resource } = JSON.parse(e.data);
          handlersRef.current.onDeployment?.(action, resource);
        } catch { /* ignore */ }
      });

      es.addEventListener("events", (e) => {
        try {
          const { action, resource } = JSON.parse(e.data);
          handlersRef.current.onEvent?.(action, resource);
        } catch { /* ignore */ }
      });

      // Health summary
      es.addEventListener("health", (e) => {
        try {
          const { resource } = JSON.parse(e.data);
          handlersRef.current.onHealth?.(resource);
        } catch { /* ignore */ }
      });

      es.onopen = () => {
        setState((prev) => ({ ...prev, connected: true, error: null }));
        backoffRef.current = MIN_BACKOFF_MS;
      };

      es.onerror = () => {
        setState((prev) => ({ ...prev, connected: false }));
        es.close();
        eventSourceRef.current = null;

        // Reconnect with exponential backoff (only if still mounted)
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          if (mountedRef.current) connect();
        }, backoffRef.current);

        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      cleanup();
      setState({ connected: false, watching: [], error: null });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterId, resourcesKey, namespace, enabled]);

  return state;
}

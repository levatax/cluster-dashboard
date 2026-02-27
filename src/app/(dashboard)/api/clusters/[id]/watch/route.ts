import { NextRequest } from "next/server";
import { getClusterById } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getWatchManager, type WatchableResource, type WatchEvent } from "@/lib/kubernetes-watch";

const VALID_RESOURCES = new Set<WatchableResource>(["nodes", "pods", "deployments", "events"]);
const KEEPALIVE_INTERVAL = 15_000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const cluster = await getClusterById(id);

  if (!cluster) {
    return new Response("Cluster not found", { status: 404 });
  }

  const { searchParams } = request.nextUrl;
  const resourcesParam = searchParams.get("resources") || "nodes,pods,deployments,events";
  const namespace = searchParams.get("namespace") || undefined;

  const resources = resourcesParam
    .split(",")
    .map((r) => r.trim() as WatchableResource)
    .filter((r) => VALID_RESOURCES.has(r));

  if (resources.length === 0) {
    return new Response("No valid resources specified", { status: 400 });
  }

  const watchManager = getWatchManager();
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let keepaliveTimer: ReturnType<typeof setInterval> | null = null;

  const readable = new ReadableStream({
    async start(controller) {
      // Send initial status
      try {
        controller.enqueue(
          encoder.encode(
            `event: status\ndata: ${JSON.stringify({ watching: resources, connected: true })}\n\n`
          )
        );
      } catch {
        return;
      }

      // Start keepalive pings
      keepaliveTimer = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`event: ping\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`)
          );
        } catch {
          // Stream closed
          if (keepaliveTimer) clearInterval(keepaliveTimer);
        }
      }, KEEPALIVE_INTERVAL);

      // Subscribe to watch events
      const handleEvent = (event: WatchEvent) => {
        try {
          // Map resource type to SSE event name
          const eventName = getSSEEventName(event);
          const payload = {
            action: event.action,
            resource: event.data,
            resourceVersion: event.resourceVersion,
          };
          controller.enqueue(
            encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`)
          );
        } catch {
          // Stream closed
        }
      };

      try {
        unsubscribe = await watchManager.subscribe(
          id,
          cluster.kubeconfig_yaml,
          resources,
          namespace,
          handleEvent
        );
      } catch {
        cleanup();
        try {
          controller.enqueue(
            encoder.encode(
              `event: status\ndata: ${JSON.stringify({ watching: [], connected: false, error: "Failed to start watch" })}\n\n`
            )
          );
          controller.close();
        } catch { /* already closed */ }
      }
    },
    cancel() {
      cleanup();
    },
  });

  // Abort on client disconnect
  request.signal.addEventListener("abort", () => {
    cleanup();
  });

  function cleanup() {
    if (keepaliveTimer) {
      clearInterval(keepaliveTimer);
      keepaliveTimer = null;
    }
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  }

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function getSSEEventName(event: WatchEvent): string {
  // Health summary updates have a dedicated flag
  if (event.isHealthSnapshot) {
    return "health";
  }

  // Resource-level snapshots (array of items for new subscribers)
  if (event.action === "SNAPSHOT" && Array.isArray(event.data)) {
    return event.resource;
  }

  // Map resource type to singular SSE event name
  const nameMap: Record<string, string> = {
    nodes: "node",
    pods: "pod",
    deployments: "deployment",
    events: "event",
  };
  return nameMap[event.resource] || event.resource;
}

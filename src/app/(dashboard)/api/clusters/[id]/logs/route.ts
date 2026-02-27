import { NextRequest } from "next/server";
import { getClusterById } from "@/lib/db";
import { createLogStream } from "@/lib/kubernetes";
import { getSession } from "@/lib/auth";

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
  const namespace = searchParams.get("namespace");
  const pod = searchParams.get("pod");
  const container = searchParams.get("container");
  const tailLines = parseInt(searchParams.get("tailLines") || "50", 10);

  if (!namespace || !pod || !container) {
    return new Response("Missing namespace, pod, or container", { status: 400 });
  }

  const { stream, abort } = createLogStream(
    cluster.kubeconfig_yaml,
    namespace,
    pod,
    container,
    tailLines
  );

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk: Buffer) => {
        try {
          const lines = chunk.toString().split("\n");
          for (const line of lines) {
            if (line) {
              controller.enqueue(encoder.encode(`data: ${line}\n\n`));
            }
          }
        } catch {
          // stream closed
        }
      });

      stream.on("end", () => {
        try {
          controller.enqueue(encoder.encode("event: done\ndata: stream ended\n\n"));
          controller.close();
        } catch {
          // already closed
        }
      });

      stream.on("error", () => {
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      abort();
    },
  });

  // Abort on client disconnect
  request.signal.addEventListener("abort", () => abort());

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

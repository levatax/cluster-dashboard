import { WebSocketServer, WebSocket } from "ws";
import * as k8s from "@kubernetes/client-node";
import { getClusterById } from "@/lib/db";
import { verifyTerminalToken } from "@/lib/auth";
import { Writable, Readable } from "node:stream";

let wss: WebSocketServer | null = null;

export function startTerminalServer(port = 3001) {
  if (wss) return;

  wss = new WebSocketServer({ port });
  console.log(`Terminal WebSocket server listening on port ${port}`);

  wss.on("connection", async (ws, req) => {
    const url = new URL(req.url || "", `http://localhost:${port}`);
    const clusterId = url.searchParams.get("clusterId") || "";
    const namespace = url.searchParams.get("namespace") || "default";
    const pod = url.searchParams.get("pod") || "";
    const container = url.searchParams.get("container") || "";
    const token = url.searchParams.get("token") || "";

    if (!clusterId || !pod) {
      ws.close(1008, "Missing required parameters");
      return;
    }

    if (!token || !verifyTerminalToken(token, clusterId, pod, namespace)) {
      ws.close(1008, "Unauthorized");
      return;
    }

    const cluster = await getClusterById(clusterId);
    if (!cluster) {
      ws.close(1008, "Cluster not found");
      return;
    }

    const kc = new k8s.KubeConfig();
    kc.loadFromString(cluster.kubeconfig_yaml);
    const exec = new k8s.Exec(kc);

    const writable = new Writable({
      write(chunk: Buffer, _encoding: string, callback: () => void) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(chunk);
        }
        callback();
      },
    });

    const stdinStream = new Readable({
      read() {},
    });

    exec
      .exec(
        namespace,
        pod,
        container,
        ["/bin/sh", "-c", "TERM=xterm exec sh"],
        writable,
        writable,
        stdinStream,
        true,
        (status) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1000, `Process exited: ${JSON.stringify(status)}`);
          }
        }
      )
      .then((wsConn) => {
        ws.on("message", (data: Buffer) => {
          stdinStream.push(data);
        });

        ws.on("close", () => {
          stdinStream.push(null);
          if (wsConn && typeof wsConn.close === "function") {
            wsConn.close();
          }
        });
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Exec failed";
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(`\r\nError: ${msg}\r\n`);
          ws.close(1011, msg);
        }
      });
  });

  wss.on("error", (err) => {
    console.error("Terminal WebSocket server error:", err);
  });
}

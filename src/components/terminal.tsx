"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal as XTermTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { getTerminalToken } from "@/app/actions/kubernetes";
import "@xterm/xterm/css/xterm.css";

const TERMINAL_WS_URL = process.env.NEXT_PUBLIC_TERMINAL_WS_URL;

interface TerminalProps {
  clusterId: string;
  namespace: string;
  pod: string;
  container: string;
}

export function Terminal({ clusterId, namespace, pod, container }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTermTerminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTermTerminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "monospace",
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();
    termRef.current = term;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsBase = TERMINAL_WS_URL || `${protocol}//${window.location.hostname}:3001`;

    // Fetch auth token before connecting
    let cancelled = false;
    getTerminalToken(clusterId, namespace, pod).then((result) => {
      if (cancelled) return;
      if (!result.success) {
        term.writeln(`\r\nFailed to authenticate: ${result.error}`);
        setError(`Failed to authenticate: ${result.error}`);
        return;
      }
      const wsUrl = `${wsBase}?clusterId=${clusterId}&namespace=${encodeURIComponent(namespace)}&pod=${encodeURIComponent(pod)}&container=${encodeURIComponent(container)}&token=${encodeURIComponent(result.data)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        term.writeln("Connected to pod terminal...\r");
      };

      ws.onmessage = (event) => {
        const data = event.data instanceof ArrayBuffer
          ? new TextDecoder().decode(event.data)
          : event.data;
        term.write(data);
      };

      ws.onclose = (event) => {
        term.writeln(`\r\nConnection closed${event.reason ? `: ${event.reason}` : ""}`);
      };

      ws.onerror = () => {
        const msg = "WebSocket error — ensure terminal server is running";
        term.writeln(`\r\n${msg}`);
        setError(msg);
      };

      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      wsRef.current?.close();
      term.dispose();
    };
  }, [clusterId, namespace, pod, container]);

  return (
    <div className="relative h-full w-full" style={{ minHeight: "300px" }}>
      {error && (
        <div className="absolute inset-x-0 top-0 z-10 rounded-t-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

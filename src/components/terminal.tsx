"use client";

import { useEffect, useRef } from "react";
import { Terminal as XTermTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

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
    const wsUrl = `${protocol}//${window.location.hostname}:3001?clusterId=${clusterId}&namespace=${encodeURIComponent(namespace)}&pod=${encodeURIComponent(pod)}&container=${encodeURIComponent(container)}`;
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
      term.writeln("\r\nWebSocket error — ensure terminal server is running on port 3001");
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      ws.close();
      term.dispose();
    };
  }, [clusterId, namespace, pod, container]);

  return (
    <div ref={containerRef} className="h-full w-full" style={{ minHeight: "300px" }} />
  );
}

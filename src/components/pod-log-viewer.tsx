"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Download, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { fetchPodLogs } from "@/app/actions/kubernetes";

interface PodLogViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clusterId: string;
  namespace: string;
  pod: string;
  containers: string[];
}

type Mode = "snapshot" | "stream";

export function PodLogViewer({
  open,
  onOpenChange,
  clusterId,
  namespace,
  pod,
  containers,
}: PodLogViewerProps) {
  const [container, setContainer] = useState(containers[0] || "");
  const [mode, setMode] = useState<Mode>("snapshot");
  const [logs, setLogs] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [tailLines, setTailLines] = useState(100);

  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const initialLoadRef = useRef(false);

  // Reset container when switching to a different pod
  useEffect(() => {
    setContainer(containers[0] || "");
    setLogs("");
    initialLoadRef.current = false;
  }, [pod, containers]);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setLogs("");
    const result = await fetchPodLogs(clusterId, namespace, pod, container, tailLines);
    if (result.success) {
      setLogs(result.data);
    } else {
      setLogs(`Error: ${result.error}`);
    }
    setLoading(false);
  }, [clusterId, namespace, pod, container, tailLines]);

  const startStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setLogs("");
    setLoading(true);

    const params = new URLSearchParams({
      namespace,
      pod,
      container,
      tailLines: "50",
    });

    const es = new EventSource(`/api/clusters/${clusterId}/logs?${params}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      setLoading(false);
      setLogs((prev) => prev + event.data + "\n");
    };

    es.addEventListener("done", () => {
      setLoading(false);
      es.close();
    });

    es.onerror = () => {
      setLoading(false);
      es.close();
    };
  }, [clusterId, namespace, pod, container]);

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, []);

  function handleContainerChange(c: string) {
    setContainer(c);
    setLogs("");
    // Trigger fetch on next render cycle
    setTimeout(() => {
      if (mode === "snapshot") loadSnapshot();
      else startStream();
    }, 0);
  }

  function handleModeChange(m: Mode) {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setMode(m);
    setLogs("");
    setTimeout(() => {
      if (m === "snapshot") loadSnapshot();
      else startStream();
    }, 0);
  }

  function handleLoad() {
    if (mode === "snapshot") loadSnapshot();
    else startStream();
  }

  function handleDownload() {
    const blob = new Blob([logs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pod}-${container}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Load initial data when opened via ref callback
  const sheetRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && !initialLoadRef.current && container) {
        initialLoadRef.current = true;
        loadSnapshot();
      }
    },
    [container, loadSnapshot]
  );

  const filteredLines = search
    ? logs.split("\n").filter((l) => l.toLowerCase().includes(search.toLowerCase()))
    : null;

  const displayLogs = filteredLines ? filteredLines.join("\n") : logs;

  return (
    <Sheet open={open} onOpenChange={(o) => {
      if (!o) {
        eventSourceRef.current?.close();
        eventSourceRef.current = null;
      }
      onOpenChange(o);
    }}>
      <SheetContent className="sm:max-w-3xl flex flex-col overflow-hidden" ref={sheetRef}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Badge variant="outline">Logs</Badge>
            <span className="truncate">{pod}</span>
          </SheetTitle>
          <SheetDescription>{namespace}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-wrap items-center gap-2 px-4">
          {containers.length > 1 && containers.map((c) => (
            <Button
              key={c}
              variant={container === c ? "default" : "outline"}
              size="sm"
              onClick={() => handleContainerChange(c)}
            >
              {c}
            </Button>
          ))}

          <div className="flex gap-1">
            <Button
              variant={mode === "snapshot" ? "default" : "outline"}
              size="sm"
              onClick={() => handleModeChange("snapshot")}
            >
              Snapshot
            </Button>
            <Button
              variant={mode === "stream" ? "default" : "outline"}
              size="sm"
              onClick={() => handleModeChange("stream")}
            >
              Stream
            </Button>
          </div>

          {mode === "snapshot" && (
            <select
              value={tailLines}
              onChange={(e) => setTailLines(Number(e.target.value))}
              className="bg-background border-input h-8 rounded-md border px-2 text-sm"
            >
              <option value={50}>50 lines</option>
              <option value={100}>100 lines</option>
              <option value={500}>500 lines</option>
              <option value={1000}>1000 lines</option>
            </select>
          )}

          <div className="ml-auto flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="size-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!logs}>
              <Download className="size-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleLoad} disabled={loading}>
              Reload
            </Button>
          </div>
        </div>

        {showSearch && (
          <div className="relative px-4">
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-8"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-muted-foreground absolute right-6 top-1/2 -translate-y-1/2"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        )}

        <ScrollArea className="flex-1 px-4 pb-4" ref={scrollRef}>
          <pre className="bg-muted/50 min-h-[200px] whitespace-pre-wrap rounded-md p-3 font-mono text-xs leading-relaxed">
            {loading && !logs ? "Loading logs..." : displayLogs || "No logs available."}
          </pre>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

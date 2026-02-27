"use client";

import { useEffect, useRef } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface BuildProgressProps {
  phase: "idle" | "building" | "succeeded" | "failed";
  logs: string;
  image?: string;
  message?: string;
}

export function BuildProgress({ phase, logs, image, message }: BuildProgressProps) {
  const scrollRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (phase === "idle") return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
        {phase === "building" && (
          <>
            <Loader2 className="size-4 animate-spin text-blue-500 shrink-0" />
            <span className="text-blue-600 dark:text-blue-400 font-medium">Building image in-cluster…</span>
          </>
        )}
        {phase === "succeeded" && (
          <>
            <CheckCircle2 className="size-4 text-green-500 shrink-0" />
            <span className="text-green-600 dark:text-green-400 font-medium">Build succeeded</span>
            {image && <span className="ml-1 font-mono text-xs text-muted-foreground truncate">{image}</span>}
          </>
        )}
        {phase === "failed" && (
          <>
            <XCircle className="size-4 text-red-500 shrink-0" />
            <span className="text-red-600 dark:text-red-400 font-medium">Build failed</span>
            {message && <span className="ml-1 text-xs text-muted-foreground">{message}</span>}
          </>
        )}
      </div>

      {logs && (
        <pre
          ref={scrollRef}
          className="max-h-64 overflow-y-auto rounded-md bg-black/90 p-3 font-mono text-xs text-green-400 leading-relaxed"
        >
          {logs}
        </pre>
      )}
    </div>
  );
}

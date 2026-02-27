"use client";

import { useEffect, useRef } from "react";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface BuildProgressProps {
  phase: "idle" | "building" | "succeeded" | "failed";
  logs: string;
  image?: string;
  message?: string;
}

const DNS_PATTERNS = [
  /could not resolve host/i,
  /name or service not known/i,
  /temporary failure in name resolution/i,
  /dns/i,
  /resolve.*failed/i,
  /getaddrinfo/i,
];

function hasDnsError(message?: string, logs?: string): boolean {
  const text = `${message ?? ""} ${logs ?? ""}`;
  return DNS_PATTERNS.some((pattern) => pattern.test(text));
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

      {phase === "failed" && hasDnsError(message, logs) && (
        <Collapsible>
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <CollapsibleTrigger className="flex w-full items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400 [&[data-state=open]>svg:first-child]:rotate-90">
              <ChevronRight className="size-3.5 shrink-0 transition-transform" />
              <AlertTriangle className="size-3.5 shrink-0" />
              DNS resolution issue detected
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 text-sm text-amber-950/80 dark:text-amber-200/80">
              <p className="mb-2">
                Your cluster nodes can&apos;t resolve external hostnames. This is
                common on fresh Hetzner clusters where CoreDNS forwards to an
                unreachable upstream.
              </p>
              <p className="mb-1 font-medium text-amber-700 dark:text-amber-300">To fix:</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>SSH into a control-plane node</li>
                <li>
                  Edit the CoreDNS config:
                  <code className="ml-1 rounded bg-amber-500/15 px-1 py-0.5 text-xs font-mono">
                    kubectl -n kube-system edit configmap coredns
                  </code>
                </li>
                <li>
                  Change{" "}
                  <code className="rounded bg-amber-500/15 px-1 py-0.5 text-xs font-mono">
                    forward . /etc/resolv.conf
                  </code>{" "}
                  to{" "}
                  <code className="rounded bg-amber-500/15 px-1 py-0.5 text-xs font-mono">
                    forward . 1.1.1.1 8.8.8.8
                  </code>
                </li>
                <li>
                  Restart CoreDNS:
                  <code className="ml-1 rounded bg-amber-500/15 px-1 py-0.5 text-xs font-mono">
                    kubectl -n kube-system rollout restart deployment coredns
                  </code>
                </li>
              </ol>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

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

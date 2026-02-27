import { Badge } from "@/components/ui/badge";

export function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span
      className={
        connected ? "status-dot-connected" : "status-dot-disconnected"
      }
    />
  );
}

export function ClusterStatusBadge({ connected }: { connected: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        connected
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
      }
    >
      <StatusDot connected={connected} />
      {connected ? "Connected" : "Disconnected"}
    </Badge>
  );
}

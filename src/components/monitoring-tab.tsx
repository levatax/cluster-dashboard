"use client";

import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/alert-banner";
import { EventsTable } from "@/components/events-table";
import type { ClusterEventInfo } from "@/lib/types";
import type { ActiveAlert } from "@/hooks/use-alert-evaluation";

interface MonitoringTabProps {
  events: ClusterEventInfo[];
  alerts: ActiveAlert[];
  onConfigureAlerts: () => void;
  initialTypeFilter?: "all" | "Normal" | "Warning";
}

export function MonitoringTab({
  events,
  alerts,
  onConfigureAlerts,
  initialTypeFilter,
}: MonitoringTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Monitoring</h2>
          <p className="text-sm text-muted-foreground">Cluster events and active alerts</p>
        </div>
        <Button variant="outline" size="sm" onClick={onConfigureAlerts}>
          <Settings className="mr-1 size-3.5" />
          Configure Alerts
        </Button>
      </div>

      <AlertBanner alerts={alerts} />
      <EventsTable events={events} initialTypeFilter={initialTypeFilter} />
    </div>
  );
}

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
}

export function MonitoringTab({
  events,
  alerts,
  onConfigureAlerts,
}: MonitoringTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Monitoring</h3>
        <Button variant="outline" size="sm" onClick={onConfigureAlerts}>
          <Settings className="mr-1 size-3.5" />
          Configure Alerts
        </Button>
      </div>

      <AlertBanner alerts={alerts} />
      <EventsTable events={events} />
    </div>
  );
}

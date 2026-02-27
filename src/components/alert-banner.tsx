"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, Eye } from "lucide-react";
import { AlertDetailSheet } from "@/components/alert-detail-sheet";
import type { ActiveAlert } from "@/hooks/use-alert-evaluation";

interface AlertBannerProps {
  alerts: ActiveAlert[];
}

export function AlertBanner({ alerts }: AlertBannerProps) {
  const [selectedAlert, setSelectedAlert] = useState<ActiveAlert | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (alerts.length === 0) return null;

  const criticals = alerts.filter((a) => a.level === "critical");
  const warnings = alerts.filter((a) => a.level === "warning");

  function handleViewDetail(alert: ActiveAlert) {
    setSelectedAlert(alert);
    setSheetOpen(true);
  }

  return (
    <>
      <div className="space-y-2">
        {criticals.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Critical Alerts ({criticals.length})</AlertTitle>
            <AlertDescription>
              <ul className="mt-1 space-y-1 text-sm">
                {criticals.map((a, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span>
                      {a.node}: {a.metric} at {a.value.toFixed(1)}% (threshold: {a.threshold}%)
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0 hover:bg-red-500/20"
                      onClick={() => handleViewDetail(a)}
                    >
                      <Eye className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        {warnings.length > 0 && (
          <Alert className="border-yellow-500/30 bg-yellow-500/5">
            <AlertTriangle className="size-4 text-yellow-600 dark:text-yellow-400" />
            <AlertTitle className="text-yellow-700 dark:text-yellow-400">
              Warnings ({warnings.length})
            </AlertTitle>
            <AlertDescription>
              <ul className="mt-1 space-y-1 text-sm">
                {warnings.map((a, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span>
                      {a.node}: {a.metric} at {a.value.toFixed(1)}% (threshold: {a.threshold}%)
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0 hover:bg-yellow-500/20"
                      onClick={() => handleViewDetail(a)}
                    >
                      <Eye className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <AlertDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        alert={selectedAlert}
      />
    </>
  );
}

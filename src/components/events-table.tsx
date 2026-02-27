"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { X, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ClusterEventInfo } from "@/lib/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface EventsTableProps {
  events: ClusterEventInfo[];
}

export function EventsTable({ events }: EventsTableProps) {
  const [typeFilter, setTypeFilter] = useState<"all" | "Normal" | "Warning">("all");
  const [selectedEvent, setSelectedEvent] = useState<ClusterEventInfo | null>(null);

  const filtered = useMemo(() => {
    if (typeFilter === "all") return events;
    return events.filter((e) => e.type === typeFilter);
  }, [events, typeFilter]);

  if (events.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center">No events found.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={typeFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setTypeFilter("all")}
        >
          All
        </Button>
        <Button
          variant={typeFilter === "Normal" ? "default" : "outline"}
          size="sm"
          onClick={() => setTypeFilter("Normal")}
        >
          Normal
        </Button>
        <Button
          variant={typeFilter === "Warning" ? "default" : "outline"}
          size="sm"
          onClick={() => setTypeFilter("Warning")}
        >
          Warning
        </Button>

        {typeFilter !== "all" && (
          <>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTypeFilter("all")}
            >
              <X className="mr-1 size-3" />
              Clear
            </Button>
          </>
        )}

        <span className="text-muted-foreground ml-auto text-sm">
          {filtered.length} of {events.length} events
        </span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[90px]">Type</TableHead>
              <TableHead className="w-[120px]">Reason</TableHead>
              <TableHead className="w-[180px]">Object</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="w-[60px]">Count</TableHead>
              <TableHead className="w-[70px]">Age</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-8 text-center"
                >
                  No events match the current filter.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((event, i) => (
                <motion.tr
                  key={`${event.namespace}/${event.name}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.02, ease }}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        event.type === "Warning"
                          ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      }
                    >
                      {event.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{event.reason}</TableCell>
                  <TableCell className="max-w-[180px] truncate font-mono text-xs">
                    {event.involvedObject}
                  </TableCell>
                  <TableCell className="max-w-[400px] truncate text-sm">
                    {event.message}
                  </TableCell>
                  <TableCell>{event.count}</TableCell>
                  <TableCell>{event.age}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <Eye className="size-3.5" />
                    </Button>
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  selectedEvent?.type === "Warning"
                    ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                }
              >
                {selectedEvent?.type}
              </Badge>
              <span className="font-mono text-sm font-normal text-muted-foreground">
                {selectedEvent?.reason}
              </span>
            </DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-3 text-sm">
              <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2">
                <dt className="text-muted-foreground">Namespace</dt>
                <dd className="font-mono">{selectedEvent.namespace || "—"}</dd>

                <dt className="text-muted-foreground">Name</dt>
                <dd className="break-all font-mono text-xs">{selectedEvent.name}</dd>

                <dt className="text-muted-foreground">Involved Object</dt>
                <dd className="break-all font-mono text-xs">{selectedEvent.involvedObject}</dd>

                <dt className="text-muted-foreground">Source</dt>
                <dd className="font-mono text-xs">{selectedEvent.source || "—"}</dd>

                <dt className="text-muted-foreground">Count</dt>
                <dd>{selectedEvent.count}</dd>

                <dt className="text-muted-foreground">Age</dt>
                <dd>{selectedEvent.age}</dd>

                <dt className="text-muted-foreground">First Seen</dt>
                <dd className="text-xs">{selectedEvent.firstTimestamp ?? "—"}</dd>

                <dt className="text-muted-foreground">Last Seen</dt>
                <dd className="text-xs">{selectedEvent.lastTimestamp ?? "—"}</dd>
              </dl>

              <Separator />

              <div>
                <p className="mb-1 text-muted-foreground">Message</p>
                <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs leading-relaxed break-words">
                  {selectedEvent.message}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

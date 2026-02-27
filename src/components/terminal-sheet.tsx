"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Terminal } from "@/components/terminal";

interface TerminalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clusterId: string;
  namespace: string;
  pod: string;
  containers: string[];
}

export function TerminalSheet({
  open,
  onOpenChange,
  clusterId,
  namespace,
  pod,
  containers,
}: TerminalSheetProps) {
  const [container, setContainer] = useState(containers[0] || "");

  // Reset container when switching to a different pod
  useEffect(() => {
    setContainer(containers[0] || "");
  }, [pod, containers]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-3xl flex flex-col overflow-hidden" side="bottom" style={{ height: "60vh" }}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            Terminal: {pod}
            {containers.length > 1 && (
              <Select value={container} onValueChange={setContainer}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {containers.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </SheetTitle>
          <SheetDescription>{namespace}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-hidden px-4 pb-4">
          {open && container && (
            <Terminal
              key={`${pod}-${container}`}
              clusterId={clusterId}
              namespace={namespace}
              pod={pod}
              container={container}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

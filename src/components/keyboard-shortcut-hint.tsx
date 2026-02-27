"use client";

import { useEffect, useState } from "react";

export function KeyboardShortcutHint() {
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes("MAC"));
  }, []);

  return (
    <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
      <span className="text-xs">{isMac ? "\u2318" : "Ctrl"}</span>K
    </kbd>
  );
}

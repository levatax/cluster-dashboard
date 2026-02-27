"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface CommandBlockProps {
  label: string;
  description?: string;
  command: string;
}

export function CommandBlock({ label, description, command }: CommandBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
      <p className="mb-1 text-sm font-medium">{label}</p>
      {description && (
        <p className="mb-2 text-xs text-muted-foreground">{description}</p>
      )}
      <div className="group relative">
        <code className="block rounded bg-muted px-3 py-2 pr-10 font-mono text-xs break-all">
          {command}
        </code>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 size-7 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="size-3.5 text-green-500" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

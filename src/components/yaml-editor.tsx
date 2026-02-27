"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="text-muted-foreground size-6 animate-spin" />
    </div>
  ),
});

interface YamlEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
}

export function YamlEditor({ value, onChange, readOnly = false, height = "100%" }: YamlEditorProps) {
  const { resolvedTheme } = useTheme();

  return (
    <MonacoEditor
      height={height}
      language="yaml"
      theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
      value={value}
      onChange={(v) => onChange?.(v ?? "")}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        wordWrap: "on",
        tabSize: 2,
        automaticLayout: true,
      }}
    />
  );
}

"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";

interface RepoInputFormProps {
  onAnalyze: (url: string, branch: string, token: string | null) => Promise<void>;
  loading: boolean;
}

export function RepoInputForm({ onAnalyze, loading }: RepoInputFormProps) {
  const [url, setUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [token, setToken] = useState("");

  function submit() {
    if (url.trim() && !loading) onAnalyze(url, branch || "", token || null);
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="https://github.com/owner/repo"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="h-9"
      />
      <div className="flex gap-2">
        <Input
          placeholder="Branch (optional)"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="h-9 flex-1"
        />
        <Input
          type="password"
          placeholder="Token (private repos)"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="h-9 flex-1"
        />
        <Button onClick={submit} disabled={!url.trim() || loading} className="h-9 shrink-0">
          {loading ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <Search className="mr-1.5 size-4" />
          )}
          {loading ? "Analyzing…" : "Analyze"}
        </Button>
      </div>
    </div>
  );
}

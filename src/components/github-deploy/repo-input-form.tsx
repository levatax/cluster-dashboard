"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Search } from "lucide-react";

interface RepoInputFormProps {
  onAnalyze: (url: string, branch: string, token: string | null) => Promise<void>;
  loading: boolean;
}

export function RepoInputForm({ onAnalyze, loading }: RepoInputFormProps) {
  const [url, setUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [token, setToken] = useState("");

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="grid gap-1.5">
        <Label htmlFor="repo-url">GitHub Repository URL</Label>
        <Input
          id="repo-url"
          placeholder="https://github.com/owner/repo"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="branch">Branch (optional)</Label>
          <Input
            id="branch"
            placeholder="main"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="token">Token (for private repos)</Label>
          <Input
            id="token"
            type="password"
            placeholder="ghp_..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>
      </div>

      <Button
        onClick={() => onAnalyze(url, branch || "", token || null)}
        disabled={!url.trim() || loading}
        className="w-full"
      >
        {loading ? (
          <Loader2 className="mr-1.5 size-4 animate-spin" />
        ) : (
          <Search className="mr-1.5 size-4" />
        )}
        {loading ? "Analyzing..." : "Analyze Repository"}
      </Button>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function ClusterError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-4 py-8">
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>Error loading cluster</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
      <Button onClick={reset}>
        <RefreshCw className="mr-2 size-4" />
        Try Again
      </Button>
    </div>
  );
}

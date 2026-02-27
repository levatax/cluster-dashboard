"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
        <Button onClick={reset} className="w-full">
          Try Again
        </Button>
      </div>
    </div>
  );
}

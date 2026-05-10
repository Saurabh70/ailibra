"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("global error boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertTriangle className="w-5 h-5 text-red-600" strokeWidth={2.2} />
      </div>
      <h2 className="text-lg font-semibold mb-1">Something went sideways</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-4">
        {error.message || "An unexpected error occurred. The page state is recoverable — try again."}
      </p>
      {error.digest && (
        <code className="text-[11px] text-muted-foreground/70 mb-4">digest: {error.digest}</code>
      )}
      <Button size="sm" onClick={reset}>
        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
        Try again
      </Button>
    </div>
  );
}

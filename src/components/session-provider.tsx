"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

// Refresh 2 minutes before the 15-minute access token expires
const REFRESH_INTERVAL_MS = 13 * 60 * 1000;

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        // Refresh failed — session is truly expired
        router.push("/login");
        router.refresh();
      }
    } catch {
      // Network error — don't redirect, will retry on next interval
    }
  }, [router]);

  useEffect(() => {
    // Start proactive refresh interval
    intervalRef.current = setInterval(refreshSession, REFRESH_INTERVAL_MS);

    // Also refresh when the tab becomes visible after being hidden
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshSession();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshSession]);

  return <>{children}</>;
}

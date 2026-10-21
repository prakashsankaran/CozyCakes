"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-reads the order every minute while the page is open, so the timeline moves on its own. */
export function AutoRefresh({ everySeconds = 60 }: { everySeconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(tick, everySeconds * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, everySeconds]);
  return null;
}

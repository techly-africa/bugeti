"use client";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/store";
import { syncUp } from "@/lib/sync";

export function useOnlineStatus() {
  const setIsOnline = useAppStore((s) => s.setIsOnline);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const count = await syncUp();
      if (count > 0) {
        toast.success(`Back online — ${count} transaction${count > 1 ? "s" : ""} synced.`);
      }
    };
    const handleOffline = () => setIsOnline(false);

    globalThis.addEventListener("online", handleOnline);
    globalThis.addEventListener("offline", handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      globalThis.removeEventListener("online", handleOnline);
      globalThis.removeEventListener("offline", handleOffline);
    };
  }, [setIsOnline]);
}

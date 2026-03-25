"use client";
import { useIsOnline } from "@/store";
import { useT } from "@/hooks/useT";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const isOnline = useIsOnline();
  const t = useT();

  if (isOnline) return null;

  return (
    <div className="w-full bg-amber-500 text-white text-xs font-medium px-4 py-2 flex items-center gap-2">
      <WifiOff size={14} />
      <span>{t("offline")}</span>
    </div>
  );
}

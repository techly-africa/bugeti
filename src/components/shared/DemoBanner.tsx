"use client";
import { FlaskConical } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useIsDemo } from "@/store";

export function DemoBanner() {
  const isDemo = useIsDemo();

  if (!isDemo && isSupabaseConfigured()) return null;

  const msg = isDemo
    ? "You're exploring a demo — changes stay on this device and reset when you sign out."
    : "Demo mode — running locally without Supabase. All data stays on this device.";

  return (
    <div className="w-full bg-violet-600 text-white text-xs font-medium px-4 py-2.5 flex items-center gap-2">
      <FlaskConical size={14} className="shrink-0" />
      <span>{msg}</span>
    </div>
  );
}

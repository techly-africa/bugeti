"use client";
import { FlaskConical } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";

export function DemoBanner() {
  // Only render on client where env vars are available
  if (isSupabaseConfigured()) return null;

  return (
    <div className="w-full bg-violet-600 text-white text-xs font-medium px-4 py-2.5 flex items-center gap-2">
      <FlaskConical size={14} className="flex-shrink-0" />
      <span>
        <strong>Demo mode</strong> — running locally without Supabase. All data
        stays on this device.{" "}
        <a
          href="https://supabase.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline opacity-80 hover:opacity-100"
        >
          Add credentials
        </a>{" "}
        to enable cloud sync.
      </span>
    </div>
  );
}

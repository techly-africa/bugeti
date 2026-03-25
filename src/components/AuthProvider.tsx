"use client";

import { useEffect, useState } from "react";
import { getSession, isSupabaseConfigured } from "@/lib/supabase";
import { useAppStore, useUser } from "@/store";

/**
 * Restores the Zustand user from the active Supabase session on page load,
 * then unblocks rendering. Prevents auth-guard redirects before the session
 * check completes.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const user = useUser();
  const setUser = useAppStore((s) => s.setUser);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Demo mode or user already in store — nothing to restore
    if (user || !isSupabaseConfigured()) {
      setReady(true);
      return;
    }

    getSession().then(({ session }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          display_name:
            session.user.user_metadata?.display_name ??
            session.user.email!.split("@")[0],
          preferred_language: "en",
          created_at: session.user.created_at,
        });
      }
      setReady(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return null;

  return <>{children}</>;
}

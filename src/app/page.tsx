"use client";
import { redirect } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@/store";

export default function Home() {
  const user = useUser();

  useEffect(() => {
    if (user) {
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/auth";
    }
  }, [user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <span className="text-6xl animate-bounce">💰</span>
        <p className="text-muted-foreground text-sm">Loading Bugeti…</p>
      </div>
    </div>
  );
}

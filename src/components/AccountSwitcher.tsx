"use client";

import { useRouter } from "next/navigation";
import { Home, Coins, Lock } from "lucide-react";
import { useAppStore, useLang, useActiveAccountType } from "@/store";
import { translations } from "@/lib/i18n";

export function AccountSwitcher() {
  const router = useRouter();
  const lang = useLang();
  const active = useActiveAccountType();
  const setActiveAccountType = useAppStore((s) => s.setActiveAccountType);
  const tx = translations[lang];

  const switchTo = (type: "common" | "savings" | "private") => {
    setActiveAccountType(type);
    if (type === "private")  router.push("/personal");
    else if (type === "savings") router.push("/savings");
    else router.push("/dashboard");
  };

  const btn = (type: "common" | "savings" | "private", icon: React.ReactNode, label: string, title: string) => (
    <button
      onClick={() => switchTo(type)}
      title={title}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
        active === type
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-1 bg-muted rounded-full p-1">
      {btn("common",  <Home  className="h-3.5 w-3.5" />, tx.commonAccount,  tx.accountTypeDesc)}
      {btn("savings", <Coins className="h-3.5 w-3.5" />, "Savings",          "Your savings goals")}
      {btn("private", <Lock  className="h-3.5 w-3.5" />, tx.privateAccount,  tx.privateAccountDesc)}
    </div>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Receipt,
  Settings,
  BarChart2,
  CalendarDays,
} from "lucide-react";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { DemoBanner } from "@/components/shared/DemoBanner";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Logo } from "@/components/shared/Logo";
import { useT } from "@/hooks/useT";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard",    icon: LayoutDashboard, key: "dashboard"    as const },
  { href: "/travel",       icon: CalendarDays,    key: "travel"       as const },
  { href: "/transactions", icon: Receipt,         key: "transactions" as const },
  { href: "/reports",      icon: BarChart2,       key: "reports"      as const },
  { href: "/settings",     icon: Settings,        key: "settings"     as const },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useT();
  useOnlineStatus();

  return (
    <div className="flex flex-col h-dvh bg-background">
      {/* Top bar */}
      <header className="shrink-0 z-50 w-full border-b bg-background">
        <DemoBanner />
        <OfflineBanner />
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center">
            <Logo variant="icon" height={36} />
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>
      </header>

      {/* Main content — scrolls independently */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 max-w-2xl mx-auto w-full">
        {children}
      </main>

      {/* Bottom nav — always in view, never behind browser chrome */}
      <nav className="shrink-0 border-t bg-background z-50 pb-safe">
        <div className="flex items-center justify-around max-w-2xl mx-auto h-16 px-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 text-xs font-medium transition-colors px-2",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={20} />
                <span className="text-[10px] leading-none">
                  {t(item.key)}
                </span>
              </Link>
            );
          })}

          {/* FAB: Add transaction */}
          <Link
            href="/transactions/new"
            className="flex flex-col items-center gap-0.5 text-xs font-medium text-primary px-2"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground shadow-lg">
              <PlusCircle size={20} />
            </div>
            <span className="text-[10px] leading-none">{t("add")}</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

"use client";
import { useAppStore, useLang } from "@/store";
import { Button } from "@/components/ui/button";

export function LanguageToggle() {
  const lang = useLang();
  const setLang = useAppStore((s) => s.setLang);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === "en" ? "rw" : "en")}
      className="font-medium text-xs px-2 gap-1"
      title={lang === "en" ? "Hindura ururimi" : "Change language"}
    >
      <span className="text-base">{lang === "en" ? "🇷🇼" : "🇬🇧"}</span>
      <span>{lang === "en" ? "RW" : "EN"}</span>
    </Button>
  );
}

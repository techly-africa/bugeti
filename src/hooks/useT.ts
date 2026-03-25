import { translations, TranslationKey } from "@/lib/i18n";
import { useLang } from "@/store";

/** Returns a translation function scoped to the current language */
export function useT() {
  const lang = useLang();
  return (key: TranslationKey): string => translations[lang][key] as string;
}

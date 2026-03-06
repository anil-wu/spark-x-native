"use client";

import { Globe } from "lucide-react";

import { useI18n } from "@/i18n/client";
import type { Locale } from "@/i18n/config";

type Props = {
  className?: string;
};

const LOCALE_SHORT_LABEL: Record<Locale, string> = {
  "zh-CN": "中",
  en: "EN",
};

export default function LanguageSwitcher({ className }: Props) {
  const { locale, t, setLocale } = useI18n();

  const nextLocale: Locale = locale === "zh-CN" ? "en" : "zh-CN";
  const nextLabel = nextLocale === "zh-CN" ? t("i18n.zh") : t("i18n.en");

  const handleSwitch = () => {
    setLocale(nextLocale);
  };

  return (
    <button
      type="button"
      onClick={handleSwitch}
      title={t("i18n.switch_to", { language: nextLabel })}
      aria-label={t("i18n.switch_to", { language: nextLabel })}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white"
      }
    >
      <Globe size={14} />
      <span>{LOCALE_SHORT_LABEL[locale]}</span>
    </button>
  );
}

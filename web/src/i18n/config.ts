export const LOCALES = ["zh-CN", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "zh-CN";

export const LOCALE_COOKIE = "locale";

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (isLocale(trimmed)) return trimmed;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith("zh")) return "zh-CN";
  if (lower.startsWith("en")) return "en";

  return null;
}


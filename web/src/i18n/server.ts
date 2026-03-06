import { cookies, headers } from "next/headers";

import { DEFAULT_LOCALE, LOCALE_COOKIE, normalizeLocale } from "./config";

export function getRequestLocale() {
  const cookieLocale = normalizeLocale(cookies().get(LOCALE_COOKIE)?.value);
  if (cookieLocale) return cookieLocale;

  const acceptLanguage = headers().get("accept-language");
  if (acceptLanguage) {
    for (const entry of acceptLanguage.split(",")) {
      const headerLocale = normalizeLocale(entry);
      if (headerLocale) return headerLocale;
    }
  }

  return DEFAULT_LOCALE;
}

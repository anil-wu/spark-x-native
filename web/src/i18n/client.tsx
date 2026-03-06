"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { LOCALE_COOKIE, type Locale } from "./config";
import type { Messages } from "./messages";
import { getMessages } from "./messages";
import { createTranslator } from "./translator";

type I18nContextValue = {
  locale: Locale;
  messages: Messages;
  t: (key: string, values?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const [activeLocale, setActiveLocale] = useState<Locale>(locale);
  const [activeMessages, setActiveMessages] = useState<Messages>(messages);

  useEffect(() => {
    setActiveLocale(locale);
    setActiveMessages(messages);
  }, [locale, messages]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setActiveLocale(nextLocale);
    setActiveMessages(getMessages(nextLocale));
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, []);

  const t = useMemo(() => createTranslator(activeMessages), [activeMessages]);
  const value = useMemo(
    () => ({ locale: activeLocale, messages: activeMessages, t, setLocale }),
    [activeLocale, activeMessages, t, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within <I18nProvider />");
  }
  return context;
}

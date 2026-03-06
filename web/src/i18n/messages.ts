import type { Locale } from "./config";

import en from "./messages/en.json";
import zhCN from "./messages/zh-CN.json";

export type Messages = typeof en;

const MESSAGES: Record<Locale, Messages> = {
  "zh-CN": zhCN,
  en,
};

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale] ?? MESSAGES["zh-CN"];
}


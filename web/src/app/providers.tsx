"use client";

import type { ReactNode } from "react";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";

export default function Providers({
  locale,
  messages,
  googleClientId,
  children,
}: {
  locale: Locale;
  messages: Messages;
  googleClientId?: string;
  children: ReactNode;
}) {
  const content = (
    <I18nProvider locale={locale} messages={messages}>
      {children}
    </I18nProvider>
  );

  if (!googleClientId) {
    return content;
  }

  return <GoogleOAuthProvider clientId={googleClientId}>{content}</GoogleOAuthProvider>;
}

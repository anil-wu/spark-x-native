import type { Metadata } from "next";
import "./globals.css";

import Providers from "./providers";
import { getRequestLocale } from "@/i18n/server";
import { getMessages } from "@/i18n/messages";
import { createTranslator } from "@/i18n/translator";

export function generateMetadata(): Metadata {
  const locale = getRequestLocale();
  const messages = getMessages(locale);
  const t = createTranslator(messages);

  return {
    title: t("app.title"),
    description: t("app.description"),
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = getRequestLocale();
  const messages = getMessages(locale);
  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();

  return (
    <html lang={locale}>
      <body>
        <Providers locale={locale} messages={messages} googleClientId={googleClientId}>
          {children}
        </Providers>
      </body>
    </html>
  );
}

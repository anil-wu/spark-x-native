import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/i18n/config";

export async function POST(request: NextRequest) {
  let locale = DEFAULT_LOCALE;

  try {
    const body = (await request.json()) as { locale?: unknown };
    if (isLocale(body?.locale)) {
      locale = body.locale;
    }
  } catch {
    // ignore invalid body
  }

  const response = NextResponse.json({ locale });
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}


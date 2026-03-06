import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const expiredAt = new Date(0).toUTCString();
  const cookieBase = `sparkx_session=; Path=/; Max-Age=0; Expires=${expiredAt}; HttpOnly; SameSite=Lax`;

  response.headers.append("Set-Cookie", `${cookieBase}; Secure`);
  response.headers.append("Set-Cookie", cookieBase);
  return response;
}

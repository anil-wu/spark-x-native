import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";

export type SparkxSession = {
  userId: number;
  email: string;
  username?: string;
  accessToken: string;
  isSuper: boolean;
};

type HeaderCarrier = {
  get(name: string): string | null;
};

const SESSION_COOKIE_NAME = "sparkx_session";
const DEFAULT_SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const DEFAULT_SESSION_COOKIE_SECURE = process.env.NODE_ENV === "production";

const getSessionSecret = (): string => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing session secret. Set SESSION_SECRET.");
  }
  return secret;
};

const getSessionMaxAge = (): number => {
  const raw = process.env.SESSION_MAX_AGE;
  const parsed = Number.parseInt(raw ?? "", 10);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_SESSION_MAX_AGE;
};

const base64UrlEncode = (value: string): string =>
  Buffer.from(value, "utf8").toString("base64url");

const base64UrlDecode = (value: string): string =>
  Buffer.from(value, "base64url").toString("utf8");

const sign = (payload: string): string =>
  createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");

const parseCookieValue = (cookieHeader: string, key: string): string | null => {
  const pairs = cookieHeader.split("; ");
  for (const pair of pairs) {
    const index = pair.indexOf("=");
    if (index === -1) continue;
    const cookieName = pair.slice(0, index);
    if (cookieName !== key) continue;
    return decodeURIComponent(pair.slice(index + 1));
  }
  return null;
};

const encodeSessionToken = (session: SparkxSession): string => {
  const payload = base64UrlEncode(
    JSON.stringify({
      userId: session.userId,
      email: session.email,
      username: session.username,
      accessToken: session.accessToken,
      isSuper: session.isSuper,
      iat: Date.now(),
    }),
  );
  const signature = sign(payload);
  return `${payload}.${signature}`;
};

const decodeSessionToken = (token: string): SparkxSession | null => {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as {
      userId?: unknown;
      email?: unknown;
      username?: unknown;
      accessToken?: unknown;
      isSuper?: unknown;
    };

    if (
      !Number.isInteger(parsed.userId) ||
      typeof parsed.email !== "string" ||
      typeof parsed.accessToken !== "string" ||
      !parsed.accessToken.trim()
    ) {
      return null;
    }

    return {
      userId: Number(parsed.userId),
      email: parsed.email,
      username:
        typeof parsed.username === "string" && parsed.username.trim()
          ? parsed.username
          : undefined,
      accessToken: parsed.accessToken.trim(),
      isSuper: parsed.isSuper === true,
    };
  } catch {
    return null;
  }
};

export const getSparkxSessionFromHeaders = (
  headers: HeaderCarrier,
): SparkxSession | null => {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) return null;
  const rawToken = parseCookieValue(cookieHeader, SESSION_COOKIE_NAME);
  if (!rawToken) return null;
  return decodeSessionToken(rawToken);
};

const getCookieSecureOverride = (): boolean | null => {
  const raw = process.env.SESSION_COOKIE_SECURE;
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
};

export const getSparkxSessionCookieSecure = (headers: HeaderCarrier): boolean => {
  const override = getCookieSecureOverride();
  if (override !== null) return override;

  const forwardedProto = headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0]?.trim().toLowerCase() === "https";
  }

  const forwardedSsl = headers.get("x-forwarded-ssl");
  if (forwardedSsl && forwardedSsl.trim().toLowerCase() === "on") {
    return true;
  }

  return DEFAULT_SESSION_COOKIE_SECURE;
};

export const applySparkxSessionCookie = (
  response: NextResponse,
  session: SparkxSession,
  options?: { secure?: boolean },
) => {
  const secure = options?.secure ?? DEFAULT_SESSION_COOKIE_SECURE;
  response.cookies.set(SESSION_COOKIE_NAME, encodeSessionToken(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: getSessionMaxAge(),
  });
};

export const clearSparkxSessionCookie = (
  response: NextResponse,
  options?: { secure?: boolean },
) => {
  const secure = options?.secure ?? DEFAULT_SESSION_COOKIE_SECURE;
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: 0,
  });
};

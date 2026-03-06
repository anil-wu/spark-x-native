import { type NextRequest, NextResponse } from "next/server";

import { fetchSparkxJson } from "@/lib/sparkx-api";
import { applySparkxSessionCookie, getSparkxSessionCookieSecure } from "@/lib/sparkx-session";

type SparkxLoginResponse = {
  userId: number;
  created: boolean;
  token: string;
  isSuper: boolean;
};

const parseBody = async (
  request: NextRequest,
): Promise<{ email: string; password: string; username?: string } | null> => {
  try {
    const payload = (await request.json()) as {
      email?: unknown;
      password?: unknown;
      username?: unknown;
    };
    if (typeof payload.email !== "string" || typeof payload.password !== "string") {
      return null;
    }
    const email = payload.email.trim();
    const password = payload.password;
    const username =
      typeof payload.username === "string" && payload.username.trim()
        ? payload.username.trim()
        : undefined;
    if (!email || !password) {
      return null;
    }
    return { email, password, username };
  } catch {
    return null;
  }
};

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await parseBody(request);
  if (!body) {
    return NextResponse.json(
      { message: "Email and password are required" },
      { status: 400 },
    );
  }

  const result = await fetchSparkxJson<SparkxLoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({
      loginType: "email",
      email: body.email,
      password: body.password,
    }),
  });

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message },
      { status: result.status },
    );
  }

  let username: string | undefined;
  const profileResult = await fetchSparkxJson<{ username?: string; email?: string }>(
    `/api/v1/users/email/${encodeURIComponent(body.email)}`,
  );
  if (profileResult.ok && typeof profileResult.data.username === "string") {
    username = profileResult.data.username;
  }

  if (result.data.created && body.username) {
    await fetchSparkxJson<{ code: number; msg: string }>(
      `/api/v1/users/${result.data.userId}`,
      {
        method: "PUT",
        body: JSON.stringify({
          username: body.username,
        }),
      },
    );
    username = body.username;
  }

  const response = NextResponse.json({
    ...result.data,
    username,
  });
  applySparkxSessionCookie(response, {
    userId: result.data.userId,
    email: body.email,
    username,
    accessToken: result.data.token,
    isSuper: result.data.isSuper,
  }, {
    secure: getSparkxSessionCookieSecure(request.headers),
  });
  return response;
}

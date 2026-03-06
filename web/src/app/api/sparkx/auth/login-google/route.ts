import { NextResponse } from "next/server";

import { fetchSparkxJson } from "@/lib/sparkx-api";
import { applySparkxSessionCookie, getSparkxSessionCookieSecure } from "@/lib/sparkx-session";

type SparkxGoogleLoginResponse = {
  userId: number;
  created: boolean;
  token: string;
  isSuper?: boolean;
};

type SparkxUserProfile = {
  id?: unknown;
  email?: unknown;
  username?: unknown;
};

type GoogleIdTokenPayload = {
  email?: unknown;
  name?: unknown;
};

const parseIdTokenPayload = (idToken: string): GoogleIdTokenPayload | null => {
  const parts = idToken.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(payload) as GoogleIdTokenPayload;
  } catch {
    return null;
  }
};

const parseBody = async (request: Request): Promise<{ idToken: string } | null> => {
  try {
    const payload = (await request.json()) as { idToken?: unknown };
    if (typeof payload.idToken !== "string" || !payload.idToken.trim()) {
      return null;
    }
    return { idToken: payload.idToken.trim() };
  } catch {
    return null;
  }
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await parseBody(request);
  if (!body) {
    return NextResponse.json({ message: "idToken is required" }, { status: 400 });
  }

  const result = await fetchSparkxJson<SparkxGoogleLoginResponse>(
    "/api/v1/auth/login",
    {
      method: "POST",
      body: JSON.stringify({
        loginType: "google",
        idToken: body.idToken,
      }),
    },
  );

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message },
      { status: result.status },
    );
  }

  const payload = parseIdTokenPayload(body.idToken);
  const email = typeof payload?.email === "string" ? payload.email.trim() : "";
  const nameFromIdToken =
    typeof payload?.name === "string" && payload.name.trim()
      ? payload.name.trim()
      : undefined;

  if (!email) {
    return NextResponse.json(
      { message: "Google token missing email" },
      { status: 400 },
    );
  }

  let sessionEmail = email;
  let username = nameFromIdToken;

  const profileResult = await fetchSparkxJson<SparkxUserProfile>(
    `/api/v1/users/email/${encodeURIComponent(email)}`,
  );
  if (profileResult.ok) {
    const profileUserId = profileResult.data.id;
    if (!Number.isInteger(profileUserId) || profileUserId !== result.data.userId) {
      return NextResponse.json(
        { message: "Google account mismatch" },
        { status: 401 },
      );
    }

    if (typeof profileResult.data.email === "string" && profileResult.data.email.trim()) {
      sessionEmail = profileResult.data.email.trim();
    }
    if (typeof profileResult.data.username === "string" && profileResult.data.username.trim()) {
      username = profileResult.data.username.trim();
    }
  }

  if (result.data.created && nameFromIdToken) {
    const updateResult = await fetchSparkxJson<{ code: number; msg: string }>(
      `/api/v1/users/${result.data.userId}`,
      {
        method: "PUT",
        body: JSON.stringify({
          username: nameFromIdToken,
        }),
      },
    );
    if (updateResult.ok) {
      username = nameFromIdToken;
    }
  }

  const response = NextResponse.json({
    userId: result.data.userId,
    created: result.data.created,
    username,
    isSuper: result.data.isSuper ?? false,
  });

  applySparkxSessionCookie(response, {
    userId: result.data.userId,
    email: sessionEmail,
    username,
    accessToken: result.data.token,
    isSuper: result.data.isSuper ?? false,
  }, {
    secure: getSparkxSessionCookieSecure(request.headers),
  });

  return response;
}

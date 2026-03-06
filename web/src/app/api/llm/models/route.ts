import { NextRequest, NextResponse } from "next/server";

import { fetchSparkxJson } from "@/lib/sparkx-api";
import { getSparkxSessionFromHeaders } from "@/lib/sparkx-session";

export async function GET(request: NextRequest) {
  const session = getSparkxSessionFromHeaders(request.headers);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const search = request.nextUrl.searchParams.toString();
  const result = await fetchSparkxJson(`/api/v1/llm/models${search ? `?${search}` : ""}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json(result.data);
}

export async function POST(request: NextRequest) {
  const session = getSparkxSessionFromHeaders(request.headers);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.isSuper) {
    return NextResponse.json({ error: "permission denied" }, { status: 403 });
  }

  const body = await request.json();
  const result = await fetchSparkxJson(`/api/v1/llm/models`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json(result.data);
}


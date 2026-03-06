import { NextRequest, NextResponse } from "next/server";

import { fetchSparkxJson } from "@/lib/sparkx-api";
import { getSparkxSessionFromHeaders } from "@/lib/sparkx-session";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = getSparkxSessionFromHeaders(request.headers);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await fetchSparkxJson(`/api/v1/llm/providers/${encodeURIComponent(id)}`, {
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

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = getSparkxSessionFromHeaders(request.headers);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.isSuper) {
    return NextResponse.json({ error: "permission denied" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const result = await fetchSparkxJson(`/api/v1/llm/providers/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json(result.data ?? { ok: true });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = getSparkxSessionFromHeaders(request.headers);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.isSuper) {
    return NextResponse.json({ error: "permission denied" }, { status: 403 });
  }

  const { id } = await params;
  const result = await fetchSparkxJson(`/api/v1/llm/providers/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json(result.data ?? { ok: true });
}


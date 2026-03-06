import { type NextRequest, NextResponse } from "next/server";

import { getSparkxApiBaseUrl } from "@/lib/sparkx-api";
import { getSparkxSessionFromHeaders } from "@/lib/sparkx-session";

const unauthorizedResponse = () =>
  NextResponse.json({ message: "Unauthorized" }, { status: 401 });

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { buildVersionId: string; assetPath: string[] } },
) {
  const session = getSparkxSessionFromHeaders(request.headers);
  if (!session) return unauthorizedResponse();

  const baseUrl = getSparkxApiBaseUrl();
  const joined = Array.isArray(params.assetPath) ? params.assetPath.join("/") : "";
  const upstreamUrl = `${baseUrl}/api/v1/previews/builds/${params.buildVersionId}/asset?path=${encodeURIComponent(joined)}`;

  const upstream = await fetch(upstreamUrl, {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    redirect: "manual",
  });

  const headers = new Headers(upstream.headers);
  headers.set("Cache-Control", "no-store");

  const location = upstream.headers.get("location");
  if (upstream.status >= 300 && upstream.status < 400 && location) {
    return new NextResponse(null, {
      status: upstream.status,
      headers: {
        Location: location,
        "Cache-Control": "no-store",
      },
    });
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}

import { type NextRequest, NextResponse } from "next/server";

import { fetchSparkxJson, getSparkxApiBaseUrl } from "@/lib/sparkx-api";
import { getSparkxSessionFromHeaders } from "@/lib/sparkx-session";

const unauthorizedResponse = () =>
  NextResponse.json({ message: "Unauthorized" }, { status: 401 });

const parseFileId = (raw: string): number | null => {
  const numeric = Number.parseInt(raw, 10);
  if (!Number.isInteger(numeric) || numeric <= 0) return null;
  return numeric;
};

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } },
) {
  const session = getSparkxSessionFromHeaders(request.headers);
  if (!session) return unauthorizedResponse();

  const fileId = parseFileId(params.fileId);
  if (!fileId) {
    return NextResponse.json({ message: "Invalid file id" }, { status: 400 });
  }

  const url = new URL(request.url);
  const versionIdRaw = url.searchParams.get("versionId");
  const versionNumberRaw = url.searchParams.get("versionNumber");
  const versionId = versionIdRaw ? Number.parseInt(versionIdRaw, 10) : NaN;
  const versionNumber = versionNumberRaw ? Number.parseInt(versionNumberRaw, 10) : NaN;
  const hasVersionId = Number.isInteger(versionId) && versionId > 0;
  const hasVersionNumber = Number.isInteger(versionNumber) && versionNumber > 0;

  if (hasVersionId || hasVersionNumber) {
    const query = new URLSearchParams();
    if (hasVersionId) query.set("versionId", String(versionId));
    if (!hasVersionId && hasVersionNumber) query.set("versionNumber", String(versionNumber));

    const download = await fetchSparkxJson<{ downloadUrl: string; expiresAt: string }>(
      `/api/v1/files/${fileId}/download?${query.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      },
    );

    if (!download.ok) {
      return NextResponse.json(
        { message: download.message },
        { status: download.status },
      );
    }

    const upstream = await fetch(download.data.downloadUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (!upstream.ok) {
      const message = await upstream.text();
      return NextResponse.json(
        { message: message || "Failed to fetch file content" },
        { status: upstream.status },
      );
    }

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";
    const cacheControl = upstream.headers.get("cache-control") || "private, max-age=3600";
    const arrayBuffer = await upstream.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
      },
    });
  }

  const upstream = await fetch(`${getSparkxApiBaseUrl()}/api/v1/files/${fileId}/content`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    cache: "no-store",
  });

  if (!upstream.ok) {
    const message = await upstream.text();
    return NextResponse.json(
      { message: message || "Failed to fetch file content" },
      { status: upstream.status },
    );
  }

  const contentType =
    upstream.headers.get("content-type") || "application/octet-stream";
  const cacheControl = upstream.headers.get("cache-control") || "private, max-age=3600";
  const arrayBuffer = await upstream.arrayBuffer();

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
    },
  });
}

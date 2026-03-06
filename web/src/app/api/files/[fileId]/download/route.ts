import { type NextRequest, NextResponse } from "next/server";

import { fetchSparkxJson } from "@/lib/sparkx-api";
import { getSparkxSessionFromHeaders } from "@/lib/sparkx-session";

const unauthorizedResponse = () =>
  NextResponse.json({ message: "Unauthorized" }, { status: 401 });

const parseFileId = (raw: string): number | null => {
  const numeric = Number.parseInt(raw, 10);
  if (!Number.isInteger(numeric) || numeric <= 0) return null;
  return numeric;
};

const parseOptionalInteger = (raw: string | null): number | null => {
  if (!raw) return null;
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
  const versionId = parseOptionalInteger(url.searchParams.get("versionId"));
  const versionNumber = parseOptionalInteger(url.searchParams.get("versionNumber"));

  const searchParams = new URLSearchParams();
  if (versionId) searchParams.set("versionId", String(versionId));
  if (versionNumber) searchParams.set("versionNumber", String(versionNumber));
  const query = searchParams.size ? `?${searchParams.toString()}` : "";

  const result = await fetchSparkxJson<{ downloadUrl: string; expiresAt: string }>(
    `/api/v1/files/${fileId}/download${query}`,
    {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    },
  );

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json(result.data);
}


import { type NextRequest, NextResponse } from "next/server";

import { fetchSparkxJson } from "@/lib/sparkx-api";
import { getSparkxSessionFromHeaders } from "@/lib/sparkx-session";

type PreUploadReq = {
  projectId: number;
  name: string;
  fileCategory: string;
  fileFormat: string;
  sizeBytes: number;
  hash: string;
  contentType?: string;
};

type PreUploadResp = {
  uploadUrl: string;
  fileId: number;
  versionId: number;
  versionNumber: number;
  contentType: string;
};

const unauthorizedResponse = () =>
  NextResponse.json({ message: "Unauthorized" }, { status: 401 });

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = getSparkxSessionFromHeaders(request.headers);
  if (!session) return unauthorizedResponse();

  let body: PreUploadReq;
  try {
    body = (await request.json()) as PreUploadReq;
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const result = await fetchSparkxJson<PreUploadResp>("/api/v1/files/preupload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json(result.data);
}

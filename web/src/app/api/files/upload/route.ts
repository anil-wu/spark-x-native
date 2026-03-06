import { type NextRequest, NextResponse } from "next/server";

import { fetchSparkxJson } from "@/lib/sparkx-api";
import { getSparkxSessionFromHeaders } from "@/lib/sparkx-session";

type UploadReq = {
  projectId: number;
  name: string;
  fileCategory: string;
  fileFormat: string;
  sizeBytes: number;
  hash: string;
  contentType?: string;
};

type UploadResp = {
  uploadUrl: string;
  fileId: number;
  versionId: number;
  versionNumber: number;
  contentType: string;
  downloadUrl?: string;
};

const unauthorizedResponse = () =>
  NextResponse.json({ message: "Unauthorized" }, { status: 401 });

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = getSparkxSessionFromHeaders(request.headers);
  if (!session) return unauthorizedResponse();

  let body: UploadReq;
  try {
    body = (await request.json()) as UploadReq;
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const useAdminPreupload = body.projectId === 0;
  if (useAdminPreupload && !session.isSuper) {
    return NextResponse.json({ message: "permission denied" }, { status: 403 });
  }

  const result = await fetchSparkxJson<UploadResp>(useAdminPreupload ? "/api/v1/admin/files/preupload" : "/api/v1/files/preupload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  // 生成下载 URL
  const downloadUrl = `/api/files/${result.data.fileId}/content`;

  return NextResponse.json({
    ...result.data,
    downloadUrl,
  });
}

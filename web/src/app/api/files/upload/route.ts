import { type NextRequest, NextResponse } from "next/server";

import { fetchSparkxJson, getSparkxApiBaseUrl } from "@/lib/sparkx-api";
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

type UploadBinaryResp = {
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

  const rawContentType = request.headers.get("content-type") ?? "";
  if (rawContentType.toLowerCase().includes("multipart/form-data")) {
    if (!session.isSuper) {
      return NextResponse.json({ message: "permission denied" }, { status: 403 });
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ message: "Invalid form data" }, { status: 400 });
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "file is required" }, { status: 400 });
    }

    const upstreamForm = new FormData();
    upstreamForm.set("file", file, file.name);

    const passthroughKeys = ["projectId", "name", "fileCategory", "fileFormat", "contentType"] as const;
    for (const key of passthroughKeys) {
      const value = form.get(key);
      if (typeof value === "string" && value.trim()) {
        upstreamForm.set(key, value.trim());
      }
    }

    const upstream = await fetch(`${getSparkxApiBaseUrl()}/api/v1/admin/files/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: upstreamForm,
      cache: "no-store",
    });

    const text = await upstream.text();
    let payload: any = null;
    try {
      payload = text ? (JSON.parse(text) as any) : null;
    } catch {
      payload = text;
    }

    if (!upstream.ok) {
      const message =
        (payload && typeof payload === "object" && typeof payload.message === "string" && payload.message.trim())
          ? payload.message.trim()
          : (payload && typeof payload === "object" && typeof payload.msg === "string" && payload.msg.trim())
            ? payload.msg.trim()
            : (payload && typeof payload === "object" && typeof payload.error === "string" && payload.error.trim())
              ? payload.error.trim()
              : (typeof payload === "string" && payload.trim())
                ? payload.trim()
                : "Request failed";
      return NextResponse.json({ message }, { status: upstream.status });
    }

    const downloadUrl =
      payload && typeof payload === "object" && typeof payload.fileId === "number"
        ? `/api/files/${payload.fileId}/content`
        : undefined;

    const result: UploadBinaryResp = {
      fileId: Number(payload?.fileId),
      versionId: Number(payload?.versionId),
      versionNumber: Number(payload?.versionNumber),
      contentType: String(payload?.contentType ?? ""),
      downloadUrl,
    };

    return NextResponse.json(result);
  }

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

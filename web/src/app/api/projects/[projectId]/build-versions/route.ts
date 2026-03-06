import { type NextRequest, NextResponse } from "next/server";

import { fetchSparkxJson } from "@/lib/sparkx-api";
import { getSparkxSessionFromHeaders } from "@/lib/sparkx-session";

const unauthorizedResponse = () =>
  NextResponse.json({ message: "Unauthorized" }, { status: 401 });

const parseProjectId = (raw: string): number | null => {
  const numeric = Number.parseInt(raw, 10);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
};

const parsePositiveInteger = (rawValue: string | null, fallback: number): number => {
  const parsed = Number.parseInt(rawValue ?? "", 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
};

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } },
) {
  const session = getSparkxSessionFromHeaders(request.headers);
  if (!session) return unauthorizedResponse();

  const projectId = parseProjectId(params.projectId);
  if (!projectId) {
    return NextResponse.json({ message: "Invalid project id" }, { status: 400 });
  }

  const url = new URL(request.url);
  const page = parsePositiveInteger(url.searchParams.get("page"), 1);
  const pageSize = parsePositiveInteger(url.searchParams.get("pageSize"), 20);

  const result = await fetchSparkxJson<unknown>(
    `/api/v1/projects/${projectId}/build-versions?page=${page}&pageSize=${pageSize}`,
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


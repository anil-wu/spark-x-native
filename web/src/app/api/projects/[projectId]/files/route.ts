import { type NextRequest, NextResponse } from "next/server";

import { fetchSparkxJson, type SparkxPagedResponse } from "@/lib/sparkx-api";
import { getSparkxSessionFromHeaders } from "@/lib/sparkx-session";

type ProjectFileItem = {
  id: number;
  projectId: number;
  name: string;
  fileCategory: string;
  fileFormat: string;
  currentVersionId: number;
  versionId: number;
  versionNumber: number;
  sizeBytes: number;
  hash: string;
  createdAt: string;
  storageKey: string;
};

const unauthorizedResponse = () =>
  NextResponse.json({ message: "Unauthorized" }, { status: 401 });

const parseProjectId = (raw: string): number | null => {
  const numeric = Number.parseInt(raw, 10);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
};

const parsePositiveInt = (
  raw: string | null,
  fallback: number,
  limits?: { min?: number; max?: number },
) => {
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  const value = Number.isInteger(parsed) ? parsed : fallback;
  const min = limits?.min ?? 1;
  const max = limits?.max ?? Number.MAX_SAFE_INTEGER;
  return Math.max(min, Math.min(max, value));
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
  const page = parsePositiveInt(url.searchParams.get("page"), 1, { min: 1, max: 100000 });
  const pageSize = parsePositiveInt(url.searchParams.get("pageSize"), 200, { min: 1, max: 500 });

  const result = await fetchSparkxJson<SparkxPagedResponse<ProjectFileItem>>(
    `/api/v1/projects/${projectId}/files?page=${page}&pageSize=${pageSize}`,
    {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    },
  );

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json(result.data);
}


import { type NextRequest, NextResponse } from "next/server";

import {
  fetchSparkxJson,
  mapSparkxProject,
  type SparkxPagedResponse,
  type SparkxProject,
} from "@/lib/sparkx-api";
import { getSparkxSessionFromHeaders } from "@/lib/sparkx-session";

const parsePositiveInteger = (
  rawValue: string | null,
  fallback: number,
): number => {
  const parsed = Number.parseInt(rawValue ?? "", 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const unauthorizedResponse = () =>
  NextResponse.json({ message: "Unauthorized" }, { status: 401 });

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = getSparkxSessionFromHeaders(request.headers);
  if (!session) return unauthorizedResponse();

  const url = new URL(request.url);
  const page = parsePositiveInteger(url.searchParams.get("page"), 1);
  const pageSize = parsePositiveInteger(url.searchParams.get("pageSize"), 20);
  const result = await fetchSparkxJson<SparkxPagedResponse<SparkxProject>>(
    `/api/v1/projects?page=${page}&pageSize=${pageSize}`,
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

  return NextResponse.json({
    list: result.data.list.map(mapSparkxProject),
    page: result.data.page,
  });
}

export async function POST(request: NextRequest) {
  const session = getSparkxSessionFromHeaders(request.headers);
  if (!session) return unauthorizedResponse();

  let body: { name?: string; description?: string; coverFileId?: number };
  try {
    body = (await request.json()) as {
      name?: string;
      description?: string;
      coverFileId?: number;
    };
  } catch {
    body = {};
  }

  const ownerId = session.userId;
  const name = body.name?.trim() || "Untitled Project";
  const description = body.description?.trim() || "";
  const coverFileId =
    typeof body.coverFileId === "number" && Number.isInteger(body.coverFileId)
      ? body.coverFileId
      : 0;

  const result = await fetchSparkxJson<SparkxProject>("/api/v1/projects", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({
      userId: ownerId,
      name,
      description,
      coverFileId,
    }),
  });

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message },
      { status: result.status },
    );
  }

  const project = mapSparkxProject(result.data);
  const projectId = result.data.id;

  await fetchSparkxJson<{ id: number }>(
    `/api/v1/projects/${projectId}/canvas`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({
        name: "Main Canvas",
        backgroundColor: "#ffffff",
        metadata: {
          gridSize: 10,
          snapEnabled: true,
        },
      }),
    },
  );

  return NextResponse.json(project);
}

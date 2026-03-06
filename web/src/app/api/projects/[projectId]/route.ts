import { type NextRequest, NextResponse } from "next/server";

import {
  fetchSparkxJson,
  mapSparkxProject,
  type SparkxProject,
} from "@/lib/sparkx-api";
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

const getSession = (request: NextRequest) =>
  getSparkxSessionFromHeaders(request.headers);

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } },
) {
  const session = getSession(request);
  if (!session) return unauthorizedResponse();

  const projectId = parseProjectId(params.projectId);
  if (!projectId) {
    return NextResponse.json({ message: "Invalid project id" }, { status: 400 });
  }

  const result = await fetchSparkxJson<SparkxProject>(`/api/v1/projects/${projectId}`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
  });
  if (!result.ok) {
    return NextResponse.json(
      { message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json(mapSparkxProject(result.data));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } },
) {
  const session = getSession(request);
  if (!session) return unauthorizedResponse();

  const projectId = parseProjectId(params.projectId);
  if (!projectId) {
    return NextResponse.json({ message: "Invalid project id" }, { status: 400 });
  }

  const result = await fetchSparkxJson<{ code: number; msg: string }>(
    `/api/v1/projects/${projectId}`,
    {
      method: "DELETE",
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string } },
) {
  const session = getSession(request);
  if (!session) return unauthorizedResponse();

  const projectId = parseProjectId(params.projectId);
  if (!projectId) {
    return NextResponse.json({ message: "Invalid project id" }, { status: 400 });
  }

  let body: {
    name?: string;
    description?: string;
    coverFileId?: number;
    status?: "active" | "archived";
  };
  try {
    body = (await request.json()) as {
      name?: string;
      description?: string;
      coverFileId?: number;
      status?: "active" | "archived";
    };
  } catch {
    body = {};
  }

  const name = body.name?.trim() || "Untitled Project";
  const description = body.description?.trim() || "";
  const coverFileId =
    typeof body.coverFileId === "number" && Number.isInteger(body.coverFileId)
      ? body.coverFileId
      : 0;
  const status = body.status === "archived" ? "archived" : "active";

  const result = await fetchSparkxJson<{ code: number; msg: string }>(
    `/api/v1/projects/${projectId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({
        name,
        description,
        coverFileId,
        status,
      }),
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

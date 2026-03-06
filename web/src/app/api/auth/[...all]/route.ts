import { NextResponse } from "next/server";

export const runtime = "nodejs";

const deprecated = () =>
  NextResponse.json(
    {
      message: "Deprecated auth endpoint. Use /api/sparkx/auth/login instead.",
    },
    { status: 410 },
  );

export const GET = deprecated;
export const POST = deprecated;

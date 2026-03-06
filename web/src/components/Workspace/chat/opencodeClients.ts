"use client";

import { createOpencodeClient } from "@opencode-ai/sdk/v2/client";

const baseUrl = process.env.NEXT_PUBLIC_OPENCODE_BASE_URL || "http://localhost:4096";

export function createOpencodeClientForDirectory(directory?: string) {
  return createOpencodeClient({ baseUrl, directory });
}

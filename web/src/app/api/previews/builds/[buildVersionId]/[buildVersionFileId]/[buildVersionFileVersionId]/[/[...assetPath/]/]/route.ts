import { type NextRequest, NextResponse } from "next/server";

import { fetchSparkxJson } from "@/lib/sparkx-api";
import { getSparkxSessionFromHeaders } from "@/lib/sparkx-session";

type BuildVersionFileEntry = {
  path: string;
  fileId: number;
  versionId?: number;
  versionNumber?: number;
};

type BuildVersionJson = {
  entry: string;
  files: BuildVersionFileEntry[];
};

const unauthorizedResponse = () =>
  NextResponse.json({ message: "Unauthorized" }, { status: 401 });

const parsePositiveInteger = (raw: string | null | undefined): number | null => {
  if (!raw) return null;
  const numeric = Number.parseInt(raw, 10);
  if (!Number.isInteger(numeric) || numeric <= 0) return null;
  return numeric;
};

const normalizeBuildPath = (raw: string): string =>
  raw.trim().replace(/^\.?\//, "").replace(/^\/+/, "");

const injectBaseHref = (html: string, baseHref: string): string => {
  if (/<base\s/i.test(html)) return html;
  const match = html.match(/<head[^>]*>/i);
  if (!match || match.index === undefined) return html;
  const insertAt = match.index + match[0].length;
  return `${html.slice(0, insertAt)}<base href="${baseHref}"/>${html.slice(insertAt)}`;
};

const rewriteAssetUrlsInHtml = (html: string, basePrefix: string): string => {
  const escapedBasePrefix = basePrefix.replaceAll("$", "$$$$");
  let out = html
    .replace(/(\bsrc=)("|')\/assets\//gi, `$1$2${escapedBasePrefix}/assets/`)
    .replace(/(\bhref=)("|')\/assets\//gi, `$1$2${escapedBasePrefix}/assets/`)
    .replace(/(\bcontent=)("|')\/assets\//gi, `$1$2${escapedBasePrefix}/assets/`);
  out = injectBaseHref(out, `${basePrefix}/`);
  return out;
};

const rewriteAssetUrlsInCss = (css: string, basePrefix: string): string => {
  const escapedBasePrefix = basePrefix.replaceAll("$", "$$$$");
  return css
    .replace(/url\(\s*\/assets\//gi, `url(${escapedBasePrefix}/assets/`)
    .replace(/@import\s+("|')\/assets\//gi, `@import $1${escapedBasePrefix}/assets/`);
};

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: {
      buildVersionId: string;
      buildVersionFileId: string;
      buildVersionFileVersionId: string;
      assetPath?: string[];
    };
  },
) {
  const session = getSparkxSessionFromHeaders(request.headers);
  if (!session) return unauthorizedResponse();

  const buildVersionId = parsePositiveInteger(params.buildVersionId);
  const buildVersionFileId = parsePositiveInteger(params.buildVersionFileId);
  const buildVersionFileVersionId = parsePositiveInteger(params.buildVersionFileVersionId);

  if (!buildVersionId || !buildVersionFileId || !buildVersionFileVersionId) {
    return NextResponse.json({ message: "Invalid preview params" }, { status: 400 });
  }

  const buildVersionFileResp = await fetchSparkxJson<{ downloadUrl: string; expiresAt: string }>(
    `/api/v1/files/${buildVersionFileId}/download?versionId=${buildVersionFileVersionId}`,
    {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    },
  );

  if (!buildVersionFileResp.ok) {
    return NextResponse.json(
      { message: buildVersionFileResp.message },
      { status: buildVersionFileResp.status },
    );
  }

  const buildVersionJsonFetch = await fetch(buildVersionFileResp.data.downloadUrl, {
    method: "GET",
    cache: "no-store",
  });
  if (!buildVersionJsonFetch.ok) {
    return NextResponse.json(
      { message: `Failed to fetch build_version.json (${buildVersionJsonFetch.status})` },
      { status: 502 },
    );
  }

  const buildVersionJsonText = await buildVersionJsonFetch.text();
  let buildVersionJson: BuildVersionJson;
  try {
    buildVersionJson = JSON.parse(buildVersionJsonText) as BuildVersionJson;
  } catch {
    return NextResponse.json({ message: "Invalid build_version.json" }, { status: 502 });
  }

  const entryPath = normalizeBuildPath(buildVersionJson.entry ?? "");
  const requestPath = Array.isArray(params.assetPath) ? params.assetPath.join("/") : "";
  const requestedRelPath = normalizeBuildPath(requestPath || entryPath);

  if (!requestedRelPath) {
    return NextResponse.json({ message: "Missing entry path" }, { status: 502 });
  }

  const files = Array.isArray(buildVersionJson.files) ? buildVersionJson.files : [];
  const fileEntry = files.find(
    (item) => normalizeBuildPath(item.path ?? "") === requestedRelPath,
  );

  if (!fileEntry || !Number.isInteger(fileEntry.fileId) || fileEntry.fileId <= 0) {
    return NextResponse.json(
      { message: `File not found in build: ${requestedRelPath}` },
      { status: 404 },
    );
  }

  const versionId =
    typeof fileEntry.versionId === "number" &&
    Number.isInteger(fileEntry.versionId) &&
    fileEntry.versionId > 0
      ? fileEntry.versionId
      : null;
  const versionNumber =
    typeof fileEntry.versionNumber === "number" &&
    Number.isInteger(fileEntry.versionNumber) &&
    fileEntry.versionNumber > 0
      ? fileEntry.versionNumber
      : null;

  const searchParams = new URLSearchParams();
  if (versionId) searchParams.set("versionId", String(versionId));
  else if (versionNumber) searchParams.set("versionNumber", String(versionNumber));
  const query = searchParams.size ? `?${searchParams.toString()}` : "";

  const downloadResp = await fetchSparkxJson<{ downloadUrl: string; expiresAt: string }>(
    `/api/v1/files/${fileEntry.fileId}/download${query}`,
    {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    },
  );

  if (!downloadResp.ok) {
    return NextResponse.json(
      { message: downloadResp.message },
      { status: downloadResp.status },
    );
  }

  const basePrefix = `/api/previews/builds/${buildVersionId}/${buildVersionFileId}/${buildVersionFileVersionId}`;
  const lowerPath = requestedRelPath.toLowerCase();
  const shouldRewriteCss = lowerPath.endsWith(".css");
  const shouldRewriteHtml = lowerPath.endsWith(".html") || requestedRelPath === entryPath;

  const upstream = await fetch(downloadResp.data.downloadUrl, {
    method: "GET",
    cache: "no-store",
  });
  if (!upstream.ok) {
    return NextResponse.json(
      { message: `Failed to fetch file content (${upstream.status})` },
      { status: 502 },
    );
  }

  const contentType = upstream.headers.get("content-type");

  if (shouldRewriteHtml || shouldRewriteCss) {
    const defaultContentType = shouldRewriteCss
      ? "text/css; charset=utf-8"
      : "text/html; charset=utf-8";
    const rawText = await upstream.text();
    const rewritten = shouldRewriteCss
      ? rewriteAssetUrlsInCss(rawText, basePrefix)
      : rewriteAssetUrlsInHtml(rawText, basePrefix);

    return new NextResponse(rewritten, {
      status: 200,
      headers: {
        "Content-Type": contentType || defaultContentType,
        "Cache-Control": "no-store",
      },
    });
  }

  const arrayBuffer = await upstream.arrayBuffer();
  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType || "application/octet-stream",
      "Cache-Control": "no-store",
    },
  });
}

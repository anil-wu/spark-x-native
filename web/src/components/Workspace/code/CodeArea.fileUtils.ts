"use client";

import type { FileViewKind } from "./CodeArea.types";

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const fixed = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(fixed)} ${units[unitIndex]}`;
}

export function getFileExt(p: string) {
  const lastDot = p.lastIndexOf(".");
  if (lastDot < 0) return "";
  return p.slice(lastDot + 1).toLowerCase();
}

export function guessKind(filePath: string, mime: string, isBinary: boolean): FileViewKind {
  const ext = getFileExt(filePath);
  const m = String(mime || "").toLowerCase();

  if (m.startsWith("image/")) return "image";
  if (m.startsWith("audio/")) return "audio";
  if (m.startsWith("video/")) return "video";

  if (ext === "md" || ext === "markdown") return "markdown";
  if (ext === "json") return "json";

  if (m.startsWith("text/")) return "text";
  if (m.includes("json")) return "json";
  if (m.includes("xml") || m.includes("yaml") || m.includes("javascript") || m.includes("typescript")) return "text";

  return isBinary ? "binary" : "text";
}

export type CodeLanguage = "plain" | "json" | "ts" | "tsx" | "js" | "jsx" | "html" | "md";

export function getCodeLanguageFromPath(filePath: string): CodeLanguage {
  const ext = getFileExt(filePath);
  if (ext === "json") return "json";
  if (ext === "ts") return "ts";
  if (ext === "tsx") return "tsx";
  if (ext === "js") return "js";
  if (ext === "jsx") return "jsx";
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "md" || ext === "markdown") return "md";
  return "plain";
}

"use client";

import React, { useMemo } from "react";
import { CodePreview } from "./CodeArea.CodePreview";
import { MarkdownPreview } from "./CodeArea.MarkdownPreview";
import { getCodeLanguageFromPath } from "./CodeArea.fileUtils";
import type { LoadedFile } from "./CodeArea.types";

export function FileViewer({
  selectedFilePath,
  loadedFile,
  fileLoading,
  fileError,
  t,
}: {
  selectedFilePath: string;
  loadedFile: LoadedFile | null;
  fileLoading: boolean;
  fileError: string | null;
  t: (key: string) => string;
}) {
  const prettyJson = useMemo(() => {
    if (!loadedFile || loadedFile.kind !== "json") return null;
    const raw = loadedFile.content ?? "";
    try {
      const obj = JSON.parse(raw);
      return JSON.stringify(obj, null, 2);
    } catch {
      return raw;
    }
  }, [loadedFile]);

  if (fileError) {
    return <div className="text-xs p-2 rounded-lg bg-red-50 text-red-700 border border-red-100">{fileError}</div>;
  }

  if (fileLoading) {
    return <div className="text-sm text-gray-500">{t("workspace.loading")}</div>;
  }

  if (!loadedFile || loadedFile.path !== selectedFilePath) {
    return <div className="text-sm text-gray-500">{t("workspace.loading")}</div>;
  }

  if (loadedFile.kind === "image") {
    return (
      <div className="w-full">
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <img src={loadedFile.rawUrl} alt={loadedFile.path} className="w-full h-auto object-contain max-h-[70vh]" loading="lazy" />
        </div>
      </div>
    );
  }

  if (loadedFile.kind === "audio") {
    return (
      <div className="space-y-3">
        <audio controls preload="metadata" className="w-full">
          <source src={loadedFile.rawUrl} />
        </audio>
        <div className="text-xs text-gray-500">{loadedFile.path}</div>
      </div>
    );
  }

  if (loadedFile.kind === "video") {
    return (
      <div className="space-y-3">
        <video controls preload="metadata" className="w-full max-h-[70vh] rounded-xl border border-gray-200 bg-black">
          <source src={loadedFile.rawUrl} />
        </video>
        <div className="text-xs text-gray-500">{loadedFile.path}</div>
      </div>
    );
  }

  if (loadedFile.kind === "markdown") {
    return <MarkdownPreview content={loadedFile.content ?? ""} />;
  }

  if (loadedFile.kind === "json") {
    return (
      <div className="overflow-auto">
        <CodePreview content={prettyJson ?? ""} language="json" />
      </div>
    );
  }

  if (loadedFile.kind === "text") {
    return (
      <div className="overflow-auto">
        <CodePreview content={loadedFile.content ?? ""} language={getCodeLanguageFromPath(loadedFile.path)} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-700">该文件为二进制格式，当前以下载/新窗口打开为主。</div>
      <a href={loadedFile.rawUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
        打开/下载 {loadedFile.path}
      </a>
    </div>
  );
}

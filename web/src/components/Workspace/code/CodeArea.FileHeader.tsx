"use client";

import React, { useMemo } from "react";
import type { LoadedFile } from "./CodeArea.types";
import { formatBytes } from "./CodeArea.fileUtils";

export function FileHeader({
  selectedFilePath,
  loadedFile,
  fileLoading,
  onRefresh,
  t,
}: {
  selectedFilePath: string;
  loadedFile: LoadedFile | null;
  fileLoading: boolean;
  onRefresh: () => void;
  t: (key: string) => string;
}) {
  const fileLabel = useMemo(() => (loadedFile?.path === selectedFilePath ? loadedFile : null), [loadedFile, selectedFilePath]);

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-white">
      <div className="min-w-0">
        <div className="text-xs font-medium text-gray-700 truncate">{selectedFilePath}</div>
        {fileLabel && (
          <div className="text-[10px] text-gray-400 mt-0.5 truncate">
            {fileLabel.mime} · {formatBytes(fileLabel.sizeBytes)}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {fileLabel?.rawUrl ? (
          <a
            href={fileLabel.rawUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-gray-600 hover:text-gray-800 hover:underline"
          >
            下载
          </a>
        ) : null}
        <button
          type="button"
          onClick={onRefresh}
          disabled={fileLoading}
          className="text-xs text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-60"
        >
          {t("chat.history_refresh")}
        </button>
      </div>
    </div>
  );
}

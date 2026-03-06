"use client";

import React from "react";
import { useI18n } from "@/i18n/client";
import ProjectPanel from "../project/ProjectPanel";
import { FileHeader } from "./CodeArea.FileHeader";
import { FileViewer } from "./CodeArea.FileViewer";
import { useWorkspaceFiles } from "./CodeArea.useWorkspaceFiles";

interface CodeAreaProps {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  projectId?: string;
  userId?: number;
  userToken?: string;
}

export default function CodeArea({ isSidebarCollapsed, toggleSidebar, projectId, userId, userToken }: CodeAreaProps) {
  const { t } = useI18n();

  const {
    selectedFilePath,
    tree,
    treeLoading,
    treeError,
    loadedFile,
    fileLoading,
    fileError,
    actions: { loadTree, selectFile, createFolder, createFile, downloadFile, downloadFolder, uploadFiles, reloadSelectedFile },
  } = useWorkspaceFiles({ projectId, userId, userToken });

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-64 flex-shrink-0 border-r border-gray-200 overflow-hidden">
        <ProjectPanel
          isCollapsed={isSidebarCollapsed}
          toggleSidebar={toggleSidebar}
          tree={tree}
          isLoading={treeLoading}
          error={treeError}
          selectedFilePath={selectedFilePath}
          onRefresh={loadTree}
          onFileSelect={selectFile}
          onCreateFolder={createFolder}
          onCreateFile={createFile}
          onDownloadFile={downloadFile}
          onDownloadFolder={downloadFolder}
          onUploadFiles={uploadFiles}
        />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden bg-white">
        {selectedFilePath ? (
          <>
            <FileHeader
              selectedFilePath={selectedFilePath}
              loadedFile={loadedFile}
              fileLoading={fileLoading}
              onRefresh={reloadSelectedFile}
              t={t}
            />
            <div className="flex-1 overflow-auto p-4">
              <FileViewer
                selectedFilePath={selectedFilePath}
                loadedFile={loadedFile}
                fileLoading={fileLoading}
                fileError={fileError}
                t={t}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-sm">{t("code.no_file_selected")}</p>
              <p className="text-xs mt-2">{t("code.select_file_hint")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

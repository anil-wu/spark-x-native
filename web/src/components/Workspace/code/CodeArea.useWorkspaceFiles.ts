"use client";

import { useCallback, useEffect, useState } from "react";
import type { FileTreeNode, LoadedFile } from "./CodeArea.types";
import { guessKind } from "./CodeArea.fileUtils";

type Params = {
  projectId?: string;
  userId?: number;
  userToken?: string;
};

export function useWorkspaceFiles({ projectId, userId, userToken }: Params) {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  const [tree, setTree] = useState<FileTreeNode | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);

  const [loadedFile, setLoadedFile] = useState<LoadedFile | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const workspaceMgrBaseUrl = process.env.NEXT_PUBLIC_OPENCODE_WORKSPACE_MGR_BASE_URL || "http://localhost:7070";
  const workspaceRoot = "game";

  const canLoadWorkspace = Boolean(projectId && userId);

  const loadTree = useCallback(async () => {
    if (!projectId || !userId) return;
    setTreeLoading(true);
    setTreeError(null);
    try {
      await fetch(`${workspaceMgrBaseUrl}/api/projects/create`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: String(userId), projectId, token: userToken || "" }),
      }).catch(() => null);

      const response = await fetch(
        `${workspaceMgrBaseUrl}/api/projects/tree?userId=${encodeURIComponent(String(userId))}&projectId=${encodeURIComponent(projectId)}&root=${encodeURIComponent(workspaceRoot)}&maxDepth=8`,
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.ok !== true) {
        throw new Error(typeof data?.error === "string" ? data.error : `HTTP ${response.status}`);
      }
      setTree((data?.tree || null) as FileTreeNode | null);
    } catch (e) {
      setTree(null);
      setTreeError(e instanceof Error ? e.message : String(e));
    } finally {
      setTreeLoading(false);
    }
  }, [projectId, userId, userToken, workspaceMgrBaseUrl, workspaceRoot]);

  const loadFile = useCallback(
    async (relativePath: string) => {
      if (!projectId || !userId) return;
      setFileLoading(true);
      setFileError(null);
      try {
        const response = await fetch(
          `${workspaceMgrBaseUrl}/api/projects/file?userId=${encodeURIComponent(String(userId))}&projectId=${encodeURIComponent(projectId)}&root=${encodeURIComponent(workspaceRoot)}&path=${encodeURIComponent(relativePath)}&maxBytes=${encodeURIComponent(String(2 * 1024 * 1024))}`,
        );
        const data = await response.json().catch(() => null);
        if (!response.ok || data?.ok !== true) {
          throw new Error(typeof data?.error === "string" ? data.error : `HTTP ${response.status}`);
        }
        const mime = typeof data?.mime === "string" ? data.mime : "application/octet-stream";
        const sizeBytes = typeof data?.sizeBytes === "number" ? data.sizeBytes : 0;
        const isBinary = !!data?.isBinary;
        const kind = guessKind(relativePath, mime, isBinary);
        const maxBytesForRaw = Math.max(20 * 1024 * 1024, Math.min(sizeBytes || 0, 200 * 1024 * 1024));
        const rawUrl = `${workspaceMgrBaseUrl}/api/projects/file/raw?userId=${encodeURIComponent(String(userId))}&projectId=${encodeURIComponent(projectId)}&root=${encodeURIComponent(workspaceRoot)}&path=${encodeURIComponent(relativePath)}&maxBytes=${encodeURIComponent(String(maxBytesForRaw))}`;
        const content = typeof data?.content === "string" ? data.content : "";
        setLoadedFile({
          path: relativePath,
          mime,
          sizeBytes,
          kind,
          content: kind === "image" || kind === "audio" || kind === "video" || kind === "binary" ? null : content,
          rawUrl,
        });
      } catch (e) {
        setLoadedFile(null);
        setFileError(e instanceof Error ? e.message : String(e));
      } finally {
        setFileLoading(false);
      }
    },
    [projectId, userId, workspaceMgrBaseUrl, workspaceRoot],
  );

  const selectFile = useCallback(
    (filePath: string) => {
      setSelectedFilePath(filePath);
      void loadFile(filePath);
    },
    [loadFile],
  );

  const createFolder = useCallback(
    async (parentPath: string, name: string) => {
      if (!projectId || !userId) return;
      const response = await fetch(`${workspaceMgrBaseUrl}/api/projects/mkdir`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: String(userId),
          projectId,
          root: workspaceRoot,
          parentPath,
          name,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.ok !== true) {
        throw new Error(typeof data?.error === "string" ? data.error : `HTTP ${response.status}`);
      }
      await loadTree();
    },
    [loadTree, projectId, userId, workspaceMgrBaseUrl, workspaceRoot],
  );

  const createFile = useCallback(
    async (parentPath: string, name: string) => {
      if (!projectId || !userId) return;
      const response = await fetch(`${workspaceMgrBaseUrl}/api/projects/write`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: String(userId),
          projectId,
          root: workspaceRoot,
          parentPath,
          name,
          content: "",
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.ok !== true) {
        throw new Error(typeof data?.error === "string" ? data.error : `HTTP ${response.status}`);
      }
      const createdPath = typeof data?.path === "string" ? data.path : parentPath ? `${parentPath}/${name}` : name;
      await loadTree();
      selectFile(createdPath);
    },
    [loadTree, projectId, userId, workspaceMgrBaseUrl, workspaceRoot, selectFile],
  );

  const downloadFile = useCallback(
    (relativePath: string) => {
      if (!projectId || !userId) return;
      const url =
        `${workspaceMgrBaseUrl}/api/projects/file/raw?userId=${encodeURIComponent(String(userId))}` +
        `&projectId=${encodeURIComponent(projectId)}` +
        `&root=${encodeURIComponent(workspaceRoot)}` +
        `&path=${encodeURIComponent(relativePath)}` +
        `&maxBytes=${encodeURIComponent(String(200 * 1024 * 1024))}` +
        `&download=1`;
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [projectId, userId, workspaceMgrBaseUrl, workspaceRoot],
  );

  const downloadFolder = useCallback(
    (folderPath: string) => {
      if (!projectId || !userId) return;
      const url =
        `${workspaceMgrBaseUrl}/api/projects/folder/archive?userId=${encodeURIComponent(String(userId))}` +
        `&projectId=${encodeURIComponent(projectId)}` +
        `&root=${encodeURIComponent(workspaceRoot)}` +
        `&path=${encodeURIComponent(folderPath)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [projectId, userId, workspaceMgrBaseUrl, workspaceRoot],
  );

  const uploadFiles = useCallback(
    async (parentPath: string, files: File[]) => {
      if (!projectId || !userId) return;
      const form = new FormData();
      for (const f of files) form.append("files", f, f.name);

      const response = await fetch(
        `${workspaceMgrBaseUrl}/api/projects/upload?userId=${encodeURIComponent(String(userId))}&projectId=${encodeURIComponent(projectId)}&root=${encodeURIComponent(workspaceRoot)}&parentPath=${encodeURIComponent(parentPath)}`,
        { method: "POST", body: form },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.ok !== true) {
        throw new Error(typeof data?.error === "string" ? data.error : `HTTP ${response.status}`);
      }
      const uploaded = Array.isArray(data?.files) ? data.files.filter((x: unknown) => typeof x === "string") : [];
      await loadTree();
      if (uploaded.length > 0) selectFile(uploaded[0]);
    },
    [loadTree, projectId, userId, workspaceMgrBaseUrl, workspaceRoot, selectFile],
  );

  const reloadSelectedFile = useCallback(() => {
    if (!selectedFilePath) return;
    void loadFile(selectedFilePath);
  }, [loadFile, selectedFilePath]);

  useEffect(() => {
    if (!canLoadWorkspace) {
      setTree(null);
      setTreeError(null);
      setTreeLoading(false);
      setSelectedFilePath(null);
      setLoadedFile(null);
      setFileError(null);
      setFileLoading(false);
      return;
    }
    void loadTree();
  }, [canLoadWorkspace, loadTree]);

  return {
    canLoadWorkspace,
    selectedFilePath,
    tree,
    treeLoading,
    treeError,
    loadedFile,
    fileLoading,
    fileError,
    actions: {
      loadTree,
      selectFile,
      createFolder,
      createFile,
      downloadFile,
      downloadFolder,
      uploadFiles,
      reloadSelectedFile,
    },
  };
}

"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n/client";
import { ChevronDown, ChevronRight, Download, File, FilePlus2, Folder, FolderOpen, FolderPlus, Minimize2, MoreHorizontal, Plus, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ProjectPanelProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  tree?: FileNode | null;
  isLoading?: boolean;
  error?: string | null;
  selectedFilePath?: string | null;
  onRefresh?: () => void;
  onFileSelect?: (filePath: string) => void;
  onCreateFolder?: (parentPath: string, name: string) => Promise<void> | void;
  onCreateFile?: (parentPath: string, name: string) => Promise<void> | void;
  onDownloadFile?: (filePath: string) => void;
  onDownloadFolder?: (folderPath: string) => void;
  onUploadFiles?: (parentPath: string, files: File[]) => Promise<void> | void;
}

interface FileNode {
  path: string;
  name: string;
  type: "folder" | "file";
  children?: FileNode[];
}

export default function ProjectPanel({
  isCollapsed,
  toggleSidebar,
  tree,
  isLoading,
  error,
  selectedFilePath,
  onRefresh,
  onFileSelect,
  onCreateFolder,
  onCreateFile,
  onDownloadFile,
  onDownloadFolder,
  onUploadFiles,
}: ProjectPanelProps) {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [openPaths, setOpenPaths] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<null | { x: number; y: number; nodePath: string; nodeType: FileNode["type"] }>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [createDialog, setCreateDialog] = useState<null | { parentPath: string; kind: "file" | "folder" }>(null);
  const [createName, setCreateName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [uploadDialog, setUploadDialog] = useState<null | { parentPath: string }>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  
  const toggleFolder = useCallback((folderPath: string) => {
    setOpenPaths(prev => ({ ...prev, [folderPath]: !prev[folderPath] }));
  }, []);

  useEffect(() => {
    if (!contextMenu) return;

    const close = () => setContextMenu(null);
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (target && contextMenuRef.current && contextMenuRef.current.contains(target)) return;
      close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    window.addEventListener("mousedown", onMouseDown, { capture: true });
    window.addEventListener("scroll", close, { capture: true });
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onMouseDown, { capture: true });
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [contextMenu]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const effectiveTree = useMemo(() => {
    if (!tree) return null;
    if (!normalizedQuery) return tree;
    const filterNode = (node: FileNode): FileNode | null => {
      const selfMatch = node.name.toLowerCase().includes(normalizedQuery) || node.path.toLowerCase().includes(normalizedQuery);
      if (node.type === "file") return selfMatch ? node : null;
      const children = (node.children || []).map(filterNode).filter(Boolean) as FileNode[];
      if (selfMatch || children.length > 0) return { ...node, children };
      return null;
    };
    return filterNode(tree);
  }, [normalizedQuery, tree]);

  const FileTreeItem = useCallback(
    ({ node, level = 0 }: { node: FileNode; level?: number }) => {
      const isFolder = node.type === "folder";
      const isOpen = normalizedQuery ? true : openPaths[node.path] ?? level < 1;
      const paddingLeft = level * 12 + 12;
      const isSelected = node.type === "file" && selectedFilePath === node.path;

      const handleClick = () => {
        if (isFolder) {
          toggleFolder(node.path);
        } else {
          onFileSelect?.(node.path);
        }
      };

      const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, nodePath: node.path, nodeType: node.type });
        if (isFolder) {
          setOpenPaths(prev => ({ ...prev, [node.path]: true }));
        } else {
          onFileSelect?.(node.path);
        }
      };

      return (
        <div className="select-none">
          <div
            className={[
              "flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer text-sm",
              isSelected ? "bg-blue-50 text-blue-700" : "hover:bg-gray-100 text-gray-700",
            ].join(" ")}
            style={{ paddingLeft: `${paddingLeft}px` }}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
          >
            {isFolder ? (
              <div className="text-gray-400">{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</div>
            ) : (
              <div className="w-3.5" />
            )}

            <div className={isFolder ? "text-blue-500" : isSelected ? "text-blue-600" : "text-gray-500"}>
              {isFolder ? (isOpen ? <FolderOpen size={16} /> : <Folder size={16} />) : <File size={16} />}
            </div>

            <span className="truncate flex-1">{node.name}</span>
          </div>

          {isFolder && isOpen && node.children && node.children.length > 0 && (
            <div>
              {node.children.map(child => (
                <FileTreeItem key={child.path} node={child} level={level + 1} />
              ))}
            </div>
          )}
        </div>
      );
    },
    [normalizedQuery, onFileSelect, openPaths, selectedFilePath, toggleFolder],
  );

  if (isCollapsed) {
    return (
      <button 
        onClick={toggleSidebar}
        className="fixed left-6 bottom-6 w-10 h-10 flex items-center justify-center z-50 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
      >
        <FolderOpen size={24} />
      </button>
    );
  }

  return (
    <div className="w-[260px] bg-white border border-gray-100 flex flex-col h-full rounded-3xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <span className="font-bold text-gray-800">{t("project.assets")}</span>
        <div className="flex items-center gap-1">
           <button className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors">
              <Plus size={16} />
           </button>
           <button className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors">
              <MoreHorizontal size={16} />
           </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="px-4 py-3 border-b border-gray-100 space-y-2">
        <div className="relative">
           <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
           <input 
              type="text" 
              placeholder={t("project.search_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
           />
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="text-xs text-gray-500 p-2">{t("workspace.loading")}</div>
        ) : error ? (
          <div className="p-2 space-y-2">
            <div className="text-xs p-2 rounded-lg bg-red-50 text-red-700 border border-red-100">{error}</div>
            {onRefresh && (
              <button type="button" onClick={onRefresh} className="text-xs text-blue-600 hover:text-blue-700 hover:underline">
                {t("chat.history_refresh")}
              </button>
            )}
          </div>
        ) : effectiveTree ? (
          <FileTreeItem node={effectiveTree} />
        ) : (
          <div className="text-xs text-gray-400 p-2">{t("workspace.loading")}</div>
        )}
      </div>

      {/* Footer / Toggle */}
      <div className="p-3 border-t border-gray-100 mt-auto">
        <button 
          onClick={toggleSidebar}
          className="w-full flex items-center justify-start px-2 py-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-lg transition-colors"
        >
          <Minimize2 size={20} />
        </button>
      </div>

      {contextMenu ? (
        <div
          ref={contextMenuRef}
          className="fixed z-[1000] w-[220px] rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
          style={{
            left: typeof window === "undefined" ? contextMenu.x : Math.min(contextMenu.x, window.innerWidth - 232),
            top: typeof window === "undefined" ? contextMenu.y : Math.min(contextMenu.y, window.innerHeight - 220),
          }}
        >
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="text-[11px] text-gray-500 truncate">{contextMenu.nodePath}</div>
          </div>
          <button
            type="button"
            className="w-full text-left px-3 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            onClick={() => {
              const { nodePath, nodeType } = contextMenu;
              setContextMenu(null);
              if (nodeType === "file") onDownloadFile?.(nodePath);
              else onDownloadFolder?.(nodePath);
            }}
          >
            <Download size={14} className="text-gray-500" />
            下载
          </button>

          <div className="h-px bg-gray-100 my-1" />
          <button
            type="button"
            className="w-full text-left px-3 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            onClick={() => {
              const parentPath =
                contextMenu.nodeType === "folder"
                  ? contextMenu.nodePath
                  : (() => {
                      const idx = contextMenu.nodePath.lastIndexOf("/");
                      return idx > 0 ? contextMenu.nodePath.slice(0, idx) : "";
                    })();
              setContextMenu(null);
              setUploadDialog({ parentPath });
              setUploadFiles([]);
              setUploadError(null);
              setUploadSubmitting(false);
            }}
          >
            <Upload size={14} className="text-gray-500" />
            上传文件
          </button>

          {contextMenu.nodeType === "folder" ? (
            <>
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                onClick={() => {
                  const parentPath = contextMenu.nodePath;
                  setContextMenu(null);
                  setCreateError(null);
                  setCreateName("");
                  setCreateDialog({ parentPath, kind: "folder" });
                }}
              >
                <FolderPlus size={14} className="text-gray-500" />
                新建文件夹
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                onClick={() => {
                  const parentPath = contextMenu.nodePath;
                  setContextMenu(null);
                  setCreateError(null);
                  setCreateName("");
                  setCreateDialog({ parentPath, kind: "file" });
                }}
              >
                <FilePlus2 size={14} className="text-gray-500" />
                新建文件
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <Dialog
        open={!!createDialog}
        onOpenChange={(open) => {
          if (open) return;
          setCreateDialog(null);
          setCreateName("");
          setCreateError(null);
          setCreateSubmitting(false);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{createDialog?.kind === "folder" ? "新建文件夹" : "新建文件"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-xs text-gray-500 truncate">{createDialog?.parentPath}</div>
            <Input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder={createDialog?.kind === "folder" ? "请输入文件夹名称" : "请输入文件名称（含扩展名）"}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (createSubmitting) return;
                const kind = createDialog?.kind;
                const parentPath = createDialog?.parentPath;
                if (!kind || parentPath == null) return;
                const name = createName.trim();
                if (!name) {
                  setCreateError("名称不能为空");
                  return;
                }
                setCreateSubmitting(true);
                setCreateError(null);
                Promise.resolve(kind === "folder" ? onCreateFolder?.(parentPath, name) : onCreateFile?.(parentPath, name))
                  .then(() => {
                    setCreateDialog(null);
                    setCreateName("");
                    setCreateError(null);
                  })
                  .catch((err) => {
                    setCreateError(err instanceof Error ? err.message : String(err));
                  })
                  .finally(() => setCreateSubmitting(false));
              }}
            />
            {createError ? <div className="text-xs text-red-600">{createError}</div> : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateDialog(null);
                setCreateName("");
                setCreateError(null);
              }}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={createSubmitting}
              onClick={() => {
                const kind = createDialog?.kind;
                const parentPath = createDialog?.parentPath;
                if (!kind || parentPath == null) return;
                const name = createName.trim();
                if (!name) {
                  setCreateError("名称不能为空");
                  return;
                }
                setCreateSubmitting(true);
                setCreateError(null);
                Promise.resolve(kind === "folder" ? onCreateFolder?.(parentPath, name) : onCreateFile?.(parentPath, name))
                  .then(() => {
                    setCreateDialog(null);
                    setCreateName("");
                    setCreateError(null);
                  })
                  .catch((err) => {
                    setCreateError(err instanceof Error ? err.message : String(err));
                  })
                  .finally(() => setCreateSubmitting(false));
              }}
            >
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!uploadDialog}
        onOpenChange={(open) => {
          if (open) return;
          setUploadDialog(null);
          setUploadFiles([]);
          setUploadError(null);
          setUploadSubmitting(false);
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>上传文件</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-gray-500 truncate">{uploadDialog?.parentPath}</div>
            <Input
              type="file"
              multiple
              onChange={(e) => {
                const list = e.target.files ? Array.from(e.target.files) : [];
                setUploadFiles(list);
                setUploadError(null);
              }}
            />
            {uploadFiles.length > 0 ? (
              <div className="max-h-40 overflow-auto rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <div className="text-[11px] text-gray-500 mb-2">已选择 {uploadFiles.length} 个文件</div>
                <div className="space-y-1">
                  {uploadFiles.map((f) => (
                    <div key={`${f.name}_${f.size}_${f.lastModified}`} className="text-xs text-gray-700 truncate">
                      {f.name}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-400">可一次选择多个文件上传</div>
            )}
            {uploadError ? <div className="text-xs text-red-600">{uploadError}</div> : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUploadDialog(null);
                setUploadFiles([]);
                setUploadError(null);
              }}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={uploadSubmitting || uploadFiles.length === 0}
              onClick={() => {
                const parentPath = uploadDialog?.parentPath;
                if (!parentPath) return;
                if (uploadFiles.length === 0) {
                  setUploadError("请先选择文件");
                  return;
                }
                setUploadSubmitting(true);
                setUploadError(null);
                Promise.resolve(onUploadFiles?.(parentPath, uploadFiles))
                  .then(() => {
                    setUploadDialog(null);
                    setUploadFiles([]);
                    setUploadError(null);
                  })
                  .catch((err) => setUploadError(err instanceof Error ? err.message : String(err)))
                  .finally(() => setUploadSubmitting(false));
              }}
            >
              上传
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

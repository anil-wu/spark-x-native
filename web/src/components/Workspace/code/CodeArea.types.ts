"use client";

export type FileTreeNode = {
  path: string;
  name: string;
  type: "folder" | "file";
  children?: FileTreeNode[];
};

export type FileViewKind = "image" | "audio" | "video" | "markdown" | "json" | "text" | "binary";

export type LoadedFile = {
  path: string;
  sizeBytes: number;
  mime: string;
  kind: FileViewKind;
  content: string | null;
  rawUrl: string;
};

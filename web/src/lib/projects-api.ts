import type { Project } from "@/lib/projects";

type ProjectsListResponse = {
  list: Project[];
  page: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export type BuildVersionItem = {
  buildVersionId: number;
  projectId: number;
  softwareManifestId: number;
  versionNumber: number;
  description: string;
  buildVersionFileId: number;
  buildVersionFileVersionId: number;
  createdBy: number;
  createdAt: string;
};

type BuildVersionsListResponse = {
  list: BuildVersionItem[];
  page: {
    page: number;
    pageSize: number;
    total: number;
  };
};

type PreUploadResponse = {
  uploadUrl: string;
  fileId: number;
  versionId: number;
  versionNumber: number;
  contentType: string;
};

const parseResponseError = async (response: Response): Promise<string> => {
  const text = await response.text();
  if (!text) return `Request failed with status ${response.status}`;
  try {
    const parsed = JSON.parse(text) as { message?: unknown; msg?: unknown };
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message;
    }
    if (typeof parsed.msg === "string" && parsed.msg.trim()) {
      return parsed.msg;
    }
  } catch {
    // fallback to plain text
  }
  return text;
};

const requestJson = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await parseResponseError(response));
  }

  return (await response.json()) as T;
};

export const listProjects = async (
  page = 1,
  pageSize = 60,
): Promise<Project[]> => {
  const data = await requestJson<ProjectsListResponse>(
    `/api/projects?page=${page}&pageSize=${pageSize}`,
  );
  console.log("listProjects--->",data);
  return data.list;
};

export const getProjectById = async (projectId: string): Promise<Project> =>
  requestJson<Project>(`/api/projects/${projectId}`);

export const listProjectBuildVersions = async (
  projectId: string,
  page = 1,
  pageSize = 60,
): Promise<BuildVersionItem[]> => {
  const data = await requestJson<BuildVersionsListResponse>(
    `/api/projects/${projectId}/build-versions?page=${page}&pageSize=${pageSize}`,
  );
  return data.list;
};

export const createProject = async (input?: {
  name?: string;
  description?: string;
  coverFileId?: number;
}): Promise<Project> =>
  requestJson<Project>("/api/projects", {
    method: "POST",
    body: JSON.stringify({
      name: input?.name,
      description: input?.description,
      coverFileId: input?.coverFileId,
    }),
  });

export const deleteProjectById = async (projectId: string): Promise<void> => {
  await requestJson<{ code?: number; msg?: string }>(`/api/projects/${projectId}`, {
    method: "DELETE",
  });
};

export const updateProjectById = async (
  projectId: string,
  updates: {
    name: string;
    description: string;
    coverFileId?: number;
    status?: "active" | "archived";
  },
): Promise<void> => {
  await requestJson<{ code?: number; msg?: string }>(`/api/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
};

const getHexDigest = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const extensionFromFile = (file: File): string => {
  const fromName = file.name.split(".").pop()?.toLowerCase() || "";
  if (fromName) return fromName;
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "bin";
};

export const uploadProjectCover = async (
  projectId: string,
  file: File,
): Promise<number> => {
  const hash = await getHexDigest(file);
  const fileFormat = extensionFromFile(file);

  const preUpload = await requestJson<PreUploadResponse>("/api/files/preupload", {
    method: "POST",
    body: JSON.stringify({
      projectId: Number(projectId),
      name: `cover-${Date.now()}.${fileFormat}`,
      fileCategory: "image",
      fileFormat,
      sizeBytes: file.size,
      hash,
      contentType: file.type || "application/octet-stream",
    }),
  });

  const uploadResp = await fetch(preUpload.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": preUpload.contentType || file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!uploadResp.ok) {
    throw new Error(`Upload failed with status ${uploadResp.status}`);
  }

  return preUpload.fileId;
};

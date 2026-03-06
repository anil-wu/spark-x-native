export interface PreUploadResponse {
  uploadUrl: string;
  fileId: number;
  versionId: number;
  versionNumber: number;
  contentType: string;
}

export interface ProjectFileItem {
  id: number;
  projectId: number;
  name: string;
  fileCategory: string;
  fileFormat: string;
  currentVersionId: number;
  versionId: number;
  versionNumber: number;
  sizeBytes: number;
  hash: string;
  createdAt: string;
  storageKey: string;
}

export interface DownloadFileResponse {
  downloadUrl: string;
  expiresAt: string;
}

export interface PagedResponse<T> {
  list: T[];
  page: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export const fileAPI = {
  /**
   * 预上传文件，获取 OSS 上传 URL
   * @param projectId 项目 ID
   * @param fileName 文件名
   * @param fileCategory 文件类别 (image | text | video | audio | binary | archive)
   * @param fileFormat 文件格式 (png | jpg | mp4 等)
   * @param sizeBytes 文件大小（字节）
   * @param hash 文件 SHA256 哈希值
   */
  preUpload: async (
    projectId: number,
    fileName: string,
    fileCategory: string,
    fileFormat: string,
    sizeBytes: number,
    hash: string
  ): Promise<PreUploadResponse | null> => {
    const result = await fetch('/api/files/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        name: fileName,
        fileCategory,
        fileFormat,
        sizeBytes,
        hash,
      }),
    });

    if (!result.ok) {
      console.error('PreUpload failed:', await result.text());
      return null;
    }

    const data = await result.json() as PreUploadResponse & { downloadUrl?: string };
    return {
      uploadUrl: data.uploadUrl,
      fileId: data.fileId,
      versionId: data.versionId,
      versionNumber: data.versionNumber,
      contentType: data.contentType,
    };
  },

  /**
   * 上传文件到 OSS
   * @param uploadUrl OSS 上传 URL
   * @param file Blob 数据
   * @param contentType Content-Type
   */
  uploadToOSS: async (
    uploadUrl: string,
    file: Blob,
    contentType: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': contentType,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('OSS upload failed:', error);
      return false;
    }
  },

  /**
   * 获取文件下载 URL
   * @param fileId 文件 ID
   */
  getDownloadUrl: (fileId: number): string => {
    return `/api/files/${fileId}/content`;
  },

  getSignedDownloadUrl: async (
    fileId: number,
    options?: { versionId?: number; versionNumber?: number },
  ): Promise<DownloadFileResponse> => {
    const searchParams = new URLSearchParams();
    if (typeof options?.versionId === "number" && Number.isInteger(options.versionId)) {
      searchParams.set("versionId", String(options.versionId));
    }
    if (typeof options?.versionNumber === "number" && Number.isInteger(options.versionNumber)) {
      searchParams.set("versionNumber", String(options.versionNumber));
    }
    const query = searchParams.size ? `?${searchParams.toString()}` : "";

    const response = await fetch(`/api/files/${fileId}/download${query}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Download request failed with status ${response.status}`);
    }

    return (await response.json()) as DownloadFileResponse;
  },

  listProjectFiles: async (
    projectId: number,
    options?: { page?: number; pageSize?: number },
  ): Promise<PagedResponse<ProjectFileItem>> => {
    const searchParams = new URLSearchParams();
    searchParams.set("page", String(options?.page && options.page > 0 ? options.page : 1));
    searchParams.set(
      "pageSize",
      String(options?.pageSize && options.pageSize > 0 ? options.pageSize : 200),
    );
    const response = await fetch(`/api/projects/${projectId}/files?${searchParams.toString()}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `List files failed with status ${response.status}`);
    }

    return (await response.json()) as PagedResponse<ProjectFileItem>;
  },

  /**
   * 计算 Blob 的 SHA256 哈希值
   * @param blob Blob 对象
   */
  calculateHash: async (blob: Blob): Promise<string> => {
    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },
};

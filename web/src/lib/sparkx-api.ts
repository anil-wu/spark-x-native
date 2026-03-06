import type { Project } from "@/lib/projects";

type SparkxProject = {
  id: number;
  name: string;
  description: string;
  coverFileId?: number;
  ownerId: number;
  status: "active" | "archived" | string;
  createdAt: string;
  updatedAt: string;
};

type SparkxPagedResponse<T> = {
  list: T[];
  page: {
    page: number;
    pageSize: number;
    total: number;
  };
};

type SparkxApiFailure = {
  ok: false;
  status: number;
  message: string;
};

type SparkxApiSuccess<T> = {
  ok: true;
  status: number;
  data: T;
};

export type SparkxApiResult<T> = SparkxApiSuccess<T> | SparkxApiFailure;

const normalizeBaseURL = (raw: string): string => {
  const source = raw.trim();
  const withProtocol = /^https?:\/\//i.test(source)
    ? source
    : `http://${source}`;
  return withProtocol.replace(/\/$/, "");
};

const parseJsonSafely = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const extractErrorMessage = (payload: unknown): string => {
  if (typeof payload === "string") {
    const normalized = payload.trim();
    return normalized || "Request failed";
  }
  if (payload && typeof payload === "object") {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
    const msg = (payload as { msg?: unknown }).msg;
    if (typeof msg === "string" && msg.trim()) {
      return msg;
    }
  }
  return "Request failed";
};

export const fetchSparkxJson = async <T>(
  path: string,
  init?: RequestInit,
): Promise<SparkxApiResult<T>> => {
  const baseUrl = getSparkxApiBaseUrl();
  try {
    console.log(`${baseUrl}${path}`);
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const payload = await parseJsonSafely(response);

    if (!response.ok) {
      console.error(`${baseUrl}${path}`, response.status, payload);
      return {
        ok: false,
        status: response.status,
        message: extractErrorMessage(payload),
      };
    }

    console.log(`${baseUrl}${path}`, response.status, payload);
    return {
      ok: true,
      status: response.status,
      data: payload as T,
    };
  } catch (error) {
    console.error(`${baseUrl}${path}`, error);
    return {
      ok: false,
      status: 502,
      message: error instanceof Error ? error.message : "Upstream request failed",
    };
  }
};

export const getSparkxApiBaseUrl = (): string => {
  const raw = process.env.SPARKX_API_BASE_URL;
  if (!raw || !raw.trim()) {
    // 返回一个默认值，避免启动时报错
    return "http://localhost:8890";
  }
  return normalizeBaseURL(raw);
};

const toIsoString = (raw: string): string => {
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return normalized;
  }
  return parsed.toISOString();
};

export const mapSparkxProject = (project: SparkxProject): Project => ({
  id: String(project.id),
  name: project.name,
  description: project.description,
  createdAt: toIsoString(project.createdAt),
  updatedAt: toIsoString(project.updatedAt),
  coverImage:
    typeof project.coverFileId === "number" && project.coverFileId > 0
      ? `/api/files/${project.coverFileId}/content`
      : undefined,
});

export type { SparkxProject, SparkxPagedResponse };

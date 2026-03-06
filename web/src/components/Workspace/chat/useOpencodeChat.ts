"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createOpencodeClientForDirectory } from "./opencodeClients";
import type {
  ChatMessage,
  MessageInfo,
  Part,
  QuestionInfoUI,
  QuestionOptionUI,
  QuestionPart,
  TodoItem,
} from "./types";

export function useOpencodeChat({
  locale,
  t,
  projectId,
  userId,
  userToken,
}: {
  locale: string;
  t: (key: string) => string;
  projectId?: string;
  userId?: number;
  userToken?: string;
}) {
  const [workspaceDirectory, setWorkspaceDirectory] = useState<string | undefined>(undefined);
  const workspaceDirectoryKeyRef = useRef<string | null>(null);
  const workspaceMgrBaseUrl = process.env.NEXT_PUBLIC_OPENCODE_WORKSPACE_MGR_BASE_URL || "http://localhost:7070";

  const userKey = userId ? String(userId) : "anon";
  const sessionProjectIndexStorageKey = useMemo(() => `sparkplay:chat:sessionProjectIndex:${userKey}`, [userKey]);
  const sessionModelStorageKeyPrefix = useMemo(
    () => `sparkplay:chat:sessionModel:${userKey}:${projectId ?? "__no_project__"}`,
    [projectId, userKey],
  );
  const llmProvidersStorageKey = useMemo(() => (userId ? `sparkplay:llm:providers:v1:${userId}` : null), [userId]);
  const agentModeStorageKey = useMemo(
    () => `sparkplay:chat:agentMode:${userKey}:${projectId ?? "__no_project__"}`,
    [projectId, userKey],
  );

  const sessionStorageKey = useMemo(() => {
    if (!projectId) return null;
    return `sparkplay:chat:lastSession:${userKey}:${projectId}`;
  }, [projectId, userKey]);

  const readStorageJson = useCallback(<T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as T;
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }, []);

  const writeStorageJson = useCallback((key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, []);

  type SessionModelSelection = { providerID: string; modelID: string };

  const getSessionModelStorageKey = useCallback(
    (targetSessionId: string) => `${sessionModelStorageKeyPrefix}:${targetSessionId}`,
    [sessionModelStorageKeyPrefix],
  );

  const readSessionModelSelection = useCallback(
    (targetSessionId: string | null): SessionModelSelection | null => {
      if (!targetSessionId) return null;
      const key = getSessionModelStorageKey(targetSessionId);
      const raw = readStorageJson<unknown>(key, null);
      const providerID = typeof (raw as any)?.providerID === "string" ? String((raw as any).providerID) : "";
      const modelID = typeof (raw as any)?.modelID === "string" ? String((raw as any).modelID) : "";
      if (!providerID || !modelID) return null;
      return { providerID, modelID };
    },
    [getSessionModelStorageKey, readStorageJson],
  );

  const writeSessionModelSelection = useCallback(
    (targetSessionId: string, selection: SessionModelSelection) => {
      const key = getSessionModelStorageKey(targetSessionId);
      writeStorageJson(key, selection);
    },
    [getSessionModelStorageKey, writeStorageJson],
  );

  const persistSessionAssociation = useCallback(
    (targetSessionId: string, pid: string | undefined) => {
      if (!pid) return;

      const index = readStorageJson<Record<string, string>>(sessionProjectIndexStorageKey, {});
      if (index[targetSessionId] !== pid) {
        index[targetSessionId] = pid;
        writeStorageJson(sessionProjectIndexStorageKey, index);
      }

      const listKey = `sparkplay:chat:projectSessions:${userKey}:${pid}`;
      const list = readStorageJson<string[]>(listKey, []);
      const next = [targetSessionId, ...list.filter(id => id !== targetSessionId)].slice(0, 100);
      writeStorageJson(listKey, next);
    },
    [readStorageJson, sessionProjectIndexStorageKey, userKey, writeStorageJson],
  );

  const removeSessionAssociation = useCallback(
    (targetSessionId: string) => {
      const index = readStorageJson<Record<string, string>>(sessionProjectIndexStorageKey, {});
      const pid = index[targetSessionId];
      if (pid) {
        delete index[targetSessionId];
        writeStorageJson(sessionProjectIndexStorageKey, index);

        const listKey = `sparkplay:chat:projectSessions:${userKey}:${pid}`;
        const list = readStorageJson<string[]>(listKey, []);
        const next = list.filter(id => id !== targetSessionId);
        writeStorageJson(listKey, next);
      }
    },
    [readStorageJson, sessionProjectIndexStorageKey, userKey, writeStorageJson],
  );

  useEffect(() => {
    if (!userId || !projectId) {
      workspaceDirectoryKeyRef.current = null;
      setWorkspaceDirectory(undefined);
      return;
    }

    const key = `${userId}:${projectId}`;
    if (workspaceDirectoryKeyRef.current === key) return;
    workspaceDirectoryKeyRef.current = key;

    void (async () => {
      try {
        const response = await fetch(`${workspaceMgrBaseUrl}/api/projects/create`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userId: String(userId), projectId, token: userToken || "" }),
        });
        const data = await response.json().catch(() => null);
        const path = typeof data?.path === "string" ? data.path : "";
        if (!response.ok || data?.ok !== true || !path) {
          throw new Error(typeof data?.error === "string" ? data.error : `HTTP ${response.status}`);
        }
        setWorkspaceDirectory(path);
      } catch {
        setWorkspaceDirectory(undefined);
        setError(t("chat.error_workspace_create_failed"));
      }
    })();
  }, [projectId, t, userId, userToken, workspaceMgrBaseUrl]);

  const opencodeClient = useMemo(() => createOpencodeClientForDirectory(workspaceDirectory), [workspaceDirectory]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  const [provider, setProvider] = useState("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [modelId, setModelId] = useState("qwen/qwen-max");
  const [configProviderID, setConfigProviderID] = useState<string | null>(null);
  const [configModelID, setConfigModelID] = useState<string | null>(null);
  const [agentMode, setAgentMode] = useState<"plan" | "build">(() => {
    try {
      const raw = localStorage.getItem(agentModeStorageKey);
      return raw === "plan" || raw === "build" ? raw : "build";
    } catch {
      return "build";
    }
  });
  const [availableProviders, setAvailableProviders] = useState<any[]>([]);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [historySessions, setHistorySessions] = useState<Array<{ id: string; title: string; time?: { created: number; updated: number } }>>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  const [agents, setAgents] = useState<any[]>([]);
  const [isAgentsLoading, setIsAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState<string | null>(null);

  const isSubscribedRef = useRef(false);
  const isInitializingRef = useRef(false);
  const bootstrapKeyRef = useRef<string | null>(null);
  const autoTitledSessionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setTodos([]);
  }, [sessionId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(agentModeStorageKey);
      setAgentMode(raw === "plan" || raw === "build" ? raw : "build");
    } catch {
      setAgentMode("build");
    }
  }, [agentModeStorageKey]);

  useEffect(() => {
    if (!sessionStorageKey) return;
    try {
      if (sessionId) localStorage.setItem(sessionStorageKey, sessionId);
    } catch {}
  }, [sessionId, sessionStorageKey]);

  const buildSessionTitle = (text: string) => {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (!normalized) return "";
    return normalized.length > 32 ? `${normalized.slice(0, 32)}…` : normalized;
  };

  const updateSessionTitle = async (targetSessionId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return false;
    try {
      const response = await opencodeClient.session.update({ sessionID: targetSessionId, title: trimmed });
      const nextTitle = (response as any).data?.title || trimmed;
      setHistorySessions(prev => {
        const idx = prev.findIndex(s => s.id === targetSessionId);
        if (idx >= 0) {
          return prev.map(s => (s.id === targetSessionId ? { ...s, title: nextTitle } : s));
        }
        return [{ id: targetSessionId, title: nextTitle }, ...prev].slice(0, 50);
      });
      autoTitledSessionsRef.current.add(targetSessionId);
      return true;
    } catch {
      return false;
    }
  };

  const ensureSessionTitle = async (targetSessionId: string, seedText: string) => {
    if (autoTitledSessionsRef.current.has(targetSessionId)) return;

    const derived = buildSessionTitle(seedText);
    if (!derived) return;

    autoTitledSessionsRef.current.add(targetSessionId);
    try {
      const existing = await opencodeClient.session.get({ sessionID: targetSessionId });
      const existingTitle = (existing as any).data?.title as string | undefined;
      if (existingTitle && existingTitle.trim()) return;
      await updateSessionTitle(targetSessionId, derived);
    } catch {
      autoTitledSessionsRef.current.delete(targetSessionId);
    }
  };

  const initSession = useCallback(async () => {
    if (isInitializingRef.current) return;

    setIsLoading(true);
    setError(null);
    isInitializingRef.current = true;
    try {
      const response = await opencodeClient.session.create({});
      if (!response.data?.id) throw new Error("No session ID returned");
      const newSessionId = response.data.id;
      persistSessionAssociation(newSessionId, projectId);
      setSessionId(newSessionId);
      setMessages([]);

      try {
        // const directoryInfo = directory ? `当前项目工作目录：${directory}` : "当前项目工作目录：未设置（缺少 userId/projectId）";
        const tokenInfo = userToken ? `token：${userToken}` : "用户 token：未设置";
        await opencodeClient.session.prompt({
          sessionID: newSessionId,
          noReply: true,
          parts: [
            {
              type: "text",
              text: [
                "用户信息：",
                "userId：" + userId,
                "projectId：" + projectId,
                "templateName：2d_game_client_phaser",
                "apiBaseUrl：https://host.docker.internal:8890",
                tokenInfo,
              ].join("\n"),
            },
          ],
        });
      } catch {}
    } catch {
      setError(t("chat.error_session_failed"));
    } finally {
      setIsLoading(false);
      isInitializingRef.current = false;
    }
  }, [opencodeClient, persistSessionAssociation, projectId, t, userId, userToken]);

  const normalizeTodos = useCallback((value: unknown): TodoItem[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((t: any) => ({
        content: typeof t?.content === "string" ? t.content : "",
        status: typeof t?.status === "string" ? t.status : "pending",
        priority: typeof t?.priority === "string" ? t.priority : "medium",
      }))
      .filter(t => t.content.trim().length > 0);
  }, []);

  const fetchConfig = useCallback(async () => {
    if (userId && projectId && !workspaceDirectory) return;
    try {
      const configResponse = await opencodeClient.config.get();
      const config = (configResponse as any)?.data;

      const fullModel = typeof config?.model === "string" ? config.model : "";
      if (fullModel) {
        const [p, ...rest] = fullModel.split("/");
        const m = rest.join("/");
        if (p && m) {
          setConfigProviderID(p);
          setConfigModelID(m);
        }
      } else {
        const providerConfig = config?.provider;
        if (providerConfig && typeof providerConfig === "object") {
          const ids = Object.keys(providerConfig);
          if (ids.length > 0) {
            const nextProvider = ids[0]!;
            setConfigProviderID(nextProvider);
            const models = (providerConfig as any)?.[nextProvider]?.models;
            if (models && typeof models === "object") {
              const firstModel = Object.keys(models)[0];
              if (firstModel) setConfigModelID(firstModel);
            }
          }
        }
      }

      const providersResponse = await opencodeClient.config.providers();
      const list = providersResponse.data?.providers;

      let nextProviders: any[] = [];
      if (Array.isArray(list)) {
        nextProviders = list;
      } else if (config?.provider && typeof config.provider === "object") {
        nextProviders = Object.entries(config.provider as Record<string, any>).map(([id, cfg]) => ({
          id,
          name: id,
          ...(cfg || {}),
        }));
      }

      if (llmProvidersStorageKey) {
        try {
          const raw = localStorage.getItem(llmProvidersStorageKey);
          const parsed = raw ? (JSON.parse(raw) as any) : null;
          const custom = Array.isArray(parsed?.providers) ? parsed.providers : [];
          const customProviders = custom
            .map((p: any) => ({
              id: typeof p?.id === "string" ? String(p.id) : "",
              name: typeof p?.name === "string" ? String(p.name) : "",
              base_url: typeof p?.base_url === "string" ? String(p.base_url) : "",
              api_key: typeof p?.api_key === "string" ? String(p.api_key) : "",
              description: typeof p?.description === "string" ? String(p.description) : "",
              models: p?.models && typeof p.models === "object" ? p.models : {},
            }))
            .filter((p: any) => p.id && p.name);

          if (customProviders.length > 0) {
            const merged = new Map<string, any>();
            for (const p of nextProviders) {
              if (p?.id) merged.set(String(p.id), p);
            }
            for (const p of customProviders) {
              merged.set(String(p.id), p);
            }
            nextProviders = Array.from(merged.values());
          }
        } catch {}
      }

      if (nextProviders.length > 0) {
        setAvailableProviders(nextProviders);
      }
    } catch {
      return;
    }
  }, [llmProvidersStorageKey, opencodeClient, projectId, userId, workspaceDirectory]);

  useEffect(() => {
    if (!configProviderID || !configModelID) return;
    if (!sessionId) {
      setProvider(configProviderID);
      setModelId(configModelID);
      return;
    }

    const selection = readSessionModelSelection(sessionId);
    if (selection) {
      setProvider(selection.providerID);
      setModelId(selection.modelID);
    } else {
      setProvider(configProviderID);
      setModelId(configModelID);
    }
  }, [configModelID, configProviderID, readSessionModelSelection, sessionId]);

  useEffect(() => {
    try {
      localStorage.setItem(agentModeStorageKey, agentMode);
    } catch {}
  }, [agentMode, agentModeStorageKey]);

  const fetchAgents = useCallback(async () => {
    setIsAgentsLoading(true);
    setAgentsError(null);
    try {
      const response = await (opencodeClient as any).app.agents();
      const raw = (response as any)?.data;
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.agents) ? raw.agents : [];
      setAgents(list);
    } catch {
      setAgentsError(t("chat.agents_load_failed"));
    } finally {
      setIsAgentsLoading(false);
    }
  }, [opencodeClient, t]);

  const formatHistoryTime = (timestamp: number | undefined) => {
    if (!timestamp) return "";
    try {
      return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(timestamp));
    } catch {
      return new Date(timestamp).toLocaleString();
    }
  };

  const formatSessionError = (rawError: any) => {
    if (!rawError) return "会话错误";
    if (typeof rawError === "string") return rawError;

    const name = typeof rawError.name === "string" ? rawError.name : typeof rawError.type === "string" ? rawError.type : "";
    const providerID =
      typeof rawError.providerID === "string" ? rawError.providerID : typeof rawError.provider === "string" ? rawError.provider : "";
    const status =
      typeof rawError.status === "number"
        ? rawError.status
        : typeof rawError.statusCode === "number"
          ? rawError.statusCode
          : typeof rawError.code === "number"
            ? rawError.code
            : undefined;
    const message =
      typeof rawError.message === "string"
        ? rawError.message
        : typeof rawError.error === "string"
          ? rawError.error
          : typeof rawError.detail === "string"
            ? rawError.detail
            : "";

    if (message.includes("Google Generative AI API key is missing") || message.includes("GOOGLE_GENERATIVE_AI_API_KEY")) {
      return `Google 鉴权失败：请设置 GOOGLE_GENERATIVE_AI_API_KEY`;
    }

    if (name.toLowerCase().includes("providerauth") || name.toLowerCase().includes("auth")) {
      return providerID ? `鉴权失败：请配置 ${providerID} 的 API Key` : "鉴权失败：请检查 API Key 配置";
    }

    if (name.toLowerCase().includes("messageoutputlength")) {
      return "输出过长：请缩短需求或让模型分步输出";
    }

    if (name.toLowerCase().includes("messageaborted") || rawError.abort === true) {
      return "会话已中断";
    }

    if (name.toLowerCase().includes("apierror") && typeof status === "number") {
      return message ? `API 错误 (${status})：${message}` : `API 错误 (${status})`;
    }

    if (message) return name ? `${name}：${message}` : message;
    if (providerID) return `会话错误：${providerID}`;
    return `会话错误：${JSON.stringify(rawError)}`;
  };

  const normalizePartForUI = useCallback((rawPart: any): Part | null => {
    if (!rawPart?.type) return null;

    if (rawPart.type === "text") {
      return {
        id: rawPart.id,
        messageID: rawPart.messageID,
        sessionID: rawPart.sessionID,
        type: "text",
        text: rawPart.text || "",
      };
    }

    if (rawPart.type === "reasoning") {
      return {
        id: rawPart.id,
        messageID: rawPart.messageID,
        sessionID: rawPart.sessionID,
        type: "reasoning",
        text: rawPart.text || "",
        time: rawPart.time,
      };
    }

    if (rawPart.type === "file") {
      return {
        id: rawPart.id,
        messageID: rawPart.messageID,
        sessionID: rawPart.sessionID,
        type: "file",
        url: rawPart.url,
        filename: rawPart.filename,
        mime: rawPart.mime,
      };
    }

    if (rawPart.type === "tool") {
      const state = rawPart.state || {};
      const status = state.status === "running" ? "executing" : state.status === "error" ? "failed" : state.status;
      const attachments = Array.isArray(state.attachments)
        ? state.attachments.filter((a: any) => a && a.type === "file").map((a: any) => ({ filename: a.filename, url: a.url }))
        : undefined;

      return {
        id: rawPart.id,
        messageID: rawPart.messageID,
        sessionID: rawPart.sessionID,
        type: "tool",
        tool: rawPart.tool,
        state: {
          status,
          title: state.title,
          input: state.input,
          output: state.output,
          error: state.error,
          attachments,
          time: state.time,
        },
      } as any;
    }

    return null;
  }, []);

  const fetchSessionHistory = async () => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await opencodeClient.session.list({ limit: 50 });
      const sessions = (response.data || []) as Array<{ id: string; title: string; time?: { created: number; updated: number } }>;
      const sorted = [...sessions].sort((a, b) => (b.time?.updated || 0) - (a.time?.updated || 0));
      if (!projectId) {
        setHistorySessions(sorted.slice(0, 50));
        return;
      }

      const inferBelongsToProject = async (targetSessionId: string, pid: string) => {
        try {
          const res = await opencodeClient.session.messages({ sessionID: targetSessionId, limit: 20 });
          const items = (res.data || []) as Array<{ parts?: any[] }>;
          for (const item of items) {
            const parts = Array.isArray(item?.parts) ? item.parts : [];
            for (const part of parts) {
              if (!part || typeof part !== "object") continue;
              const type = (part as any).type;
              if (type !== "text" && type !== "reasoning") continue;
              const rawText = (part as any).text;
              const text =
                typeof rawText === "string" ? rawText : Array.isArray(rawText) ? rawText.filter(Boolean).join("") : rawText ? String(rawText) : "";
              if (!text) continue;
              if (text.includes(`projectId：${pid}`) || text.includes(`projectId:${pid}`)) return true;
            }
          }
          return false;
        } catch {
          return false;
        }
      };

      const index = readStorageJson<Record<string, string>>(sessionProjectIndexStorageKey, {});
      const unknown = sorted.filter(s => index[s.id] === undefined || index[s.id] === "__unknown__");

      if (unknown.length > 0) {
        const queue = [...unknown];
        const concurrency = 5;
        const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () =>
          (async () => {
            while (queue.length > 0) {
              const next = queue.shift();
              if (!next) return;
              const ok = await inferBelongsToProject(next.id, projectId);
              if (ok) {
                persistSessionAssociation(next.id, projectId);
              } else {
                const cur = readStorageJson<Record<string, string>>(sessionProjectIndexStorageKey, {});
                if (cur[next.id] === undefined || cur[next.id] === "__unknown__") {
                  cur[next.id] = "__unknown__";
                  writeStorageJson(sessionProjectIndexStorageKey, cur);
                }
              }
            }
          })(),
        );
        await Promise.all(workers);
      }

      const refreshedIndex = readStorageJson<Record<string, string>>(sessionProjectIndexStorageKey, {});
      const filtered = sorted.filter(s => refreshedIndex[s.id] === projectId);
      setHistorySessions(filtered.slice(0, 50));
    } catch {
      setHistoryError(t("chat.history_load_failed"));
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const loadHistorySession = useCallback(async (targetSessionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await opencodeClient.session.messages({
        sessionID: targetSessionId,
        limit: 200,
      });

      const items = (response.data || []) as Array<{ info: any; parts: any[] }>;
      const nextMessages: ChatMessage[] = items
        .map(({ info, parts }) => {
          const normalizedParts = (parts || []).map(normalizePartForUI).filter(Boolean) as Part[];
          const content = normalizedParts
            .map(p => {
              if (p.type === "text" || p.type === "reasoning") return (p as any).text;
              return "";
            })
            .join("");
          return {
            id: info.id,
            role: info.role,
            content,
            timestamp: new Date(info.time?.created || Date.now()),
            parts: normalizedParts,
            info,
          };
        })
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      setSessionId(targetSessionId);
      setMessages(nextMessages);
      persistSessionAssociation(targetSessionId, projectId);
      return true;
    } catch {
      setError(t("chat.history_session_load_failed"));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [normalizePartForUI, opencodeClient.session, persistSessionAssociation, projectId, t]);

  const bootstrapSession = useCallback(async () => {
    if (userId && projectId && !workspaceDirectory) return;
    const bootstrapKey = sessionStorageKey ?? "__no_session_storage_key__";
    if (bootstrapKeyRef.current === bootstrapKey) return;
    bootstrapKeyRef.current = bootstrapKey;

    setMessages([]);
    setTodos([]);
    setError(null);
    setHistoryError(null);
    setIsOnline(null);
    setSessionId(null);

    let savedSessionId: string | null = null;
    if (sessionStorageKey) {
      try {
        savedSessionId = localStorage.getItem(sessionStorageKey);
      } catch {}
    }

    if (savedSessionId) {
      const ok = await loadHistorySession(savedSessionId);
      if (ok) return;
      try {
        localStorage.removeItem(sessionStorageKey!);
      } catch {}
    }

    await initSession();
  }, [initSession, loadHistorySession, projectId, sessionStorageKey, userId, workspaceDirectory]);

  useEffect(() => {
    void bootstrapSession();
  }, [bootstrapSession]);

  const checkHealth = useCallback(async () => {
    try {
      const response = await opencodeClient.config.get();
      const online = !!response.data;
      if (online && !sessionId && !isLoading && !isInitializingRef.current) {
        void bootstrapSession();
      }
      setIsOnline(online);
    } catch {
      setIsOnline(false);
    }
  }, [bootstrapSession, isLoading, opencodeClient.config, sessionId]);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  const deleteHistorySession = async (targetSessionId: string) => {
    const ok = confirm(t("chat.history_delete_confirm"));
    if (!ok) return false;

    setDeletingSessionId(targetSessionId);
    setHistoryError(null);
    try {
      await opencodeClient.session.delete({ sessionID: targetSessionId });

        removeSessionAssociation(targetSessionId);
      setHistorySessions(prev => prev.filter(s => s.id !== targetSessionId));

      if (targetSessionId === sessionId) {
        setMessages([]);
        setSessionId(null);
        await initSession();
      }

      await fetchSessionHistory();
      return true;
    } catch {
      setHistoryError(t("chat.history_delete_failed"));
      return false;
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleRenameSession = async (targetSessionId: string) => {
    const currentTitle = historySessions.find(s => s.id === targetSessionId)?.title || "";
    const nextTitle = prompt("会话标题:", currentTitle);
    if (nextTitle === null) return false;
    await updateSessionTitle(targetSessionId, nextTitle);
    await fetchSessionHistory();
    return true;
  };

  const handleSaveSettings = async (nextProvider?: string, nextModelId?: string) => {
    setIsSavingSettings(true);
    setSettingsFeedback(null);
    try {
      const effectiveProvider = typeof nextProvider === "string" && nextProvider.trim() ? nextProvider.trim() : provider;
      const effectiveModelId = typeof nextModelId === "string" && nextModelId.trim() ? nextModelId.trim() : modelId;

      if (!sessionId) throw new Error("Missing sessionId");
      writeSessionModelSelection(sessionId, { providerID: effectiveProvider, modelID: effectiveModelId });
      if (effectiveProvider !== provider) setProvider(effectiveProvider);
      if (effectiveModelId !== modelId) setModelId(effectiveModelId);
      setSettingsFeedback({ type: "success", message: t("chat.settings_saved") });

      return true;
    } catch {
      setSettingsFeedback({ type: "error", message: t("chat.settings_failed") });
      return false;
    } finally {
      setIsSavingSettings(false);
    }
  };

  const updateQuestionState = useCallback((requestID: string, patch: Partial<NonNullable<QuestionPart["state"]>>) => {
    setMessages(prev =>
      prev.map(m => {
        if (!m.parts || m.parts.length === 0) return m;
        let changed = false;
        const nextParts = m.parts.map(p => {
          if (p.type !== "question") return p;
          const qp = p as QuestionPart;
          if (qp.requestID !== requestID) return p;
          changed = true;
          return {
            ...qp,
            state: {
              status: qp.state?.status || "pending",
              ...qp.state,
              ...patch,
            },
          } as QuestionPart;
        });
        if (!changed) return m;
        return { ...m, parts: nextParts };
      }),
    );
  }, []);

  const handleReplyQuestion = useCallback(async (requestID: string, answers: Array<Array<string>>) => {
    try {
      const res = await opencodeClient.question.reply({ requestID, answers });
      if ((res as any)?.error) throw (res as any).error;
      updateQuestionState(requestID, { status: "replied", answers });
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : JSON.stringify(e);
      setError(`问题回答失败：${msg}`);
    }
  }, [opencodeClient, updateQuestionState]);

  const handleRejectQuestion = useCallback(async (requestID: string) => {
    try {
      const res = await opencodeClient.question.reject({ requestID });
      if ((res as any)?.error) throw (res as any).error;
      updateQuestionState(requestID, { status: "rejected" });
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : JSON.stringify(e);
      setError(`跳过问题失败：${msg}`);
    }
  }, [opencodeClient, updateQuestionState]);

  const normalizeQuestionsForUI = useCallback((rawQuestions: any): Array<QuestionInfoUI> => {
    const list = Array.isArray(rawQuestions) ? rawQuestions : [];
    return list
      .map((q: any) => {
        const question = typeof q?.question === "string" ? q.question : "";
        const header = typeof q?.header === "string" ? q.header : undefined;
        const multiple = typeof q?.multiple === "boolean" ? q.multiple : !!q?.multiple;
        const custom = typeof q?.custom === "boolean" ? q.custom : q?.custom === undefined ? true : !!q?.custom;
        const rawOptions = Array.isArray(q?.options) ? q.options : [];
        const options: Array<QuestionOptionUI> = rawOptions
          .map((o: any) => {
            if (typeof o === "string") return { label: o };
            if (o && typeof o.label === "string") {
              return { label: o.label, description: typeof o.description === "string" ? o.description : undefined };
            }
            return null;
          })
          .filter(Boolean) as Array<QuestionOptionUI>;

        if (!question) return null;
        return { header, question, options, multiple, custom } as QuestionInfoUI;
      })
      .filter(Boolean) as Array<QuestionInfoUI>;
  }, []);

  useEffect(() => {
    if (!sessionId || !isOnline) return;
    if (isSubscribedRef.current) return;

    let isCancelled = false;
    isSubscribedRef.current = true;
    let stream: AsyncGenerator<any, any, any> | null = null;

    const setupSSE = async () => {
      try {
        const events = await opencodeClient.event.subscribe();
        if (isCancelled) return;
        stream = events.stream as any;

        for await (const event of events.stream) {
          if (isCancelled) break;

          const eventType: string = event.type;
          console.log("eventType", eventType, event.properties);
          if (eventType === "message.part.delta") {
            const { delta, field, messageID, partID, sessionID: eventSessionID } = event.properties as any;
            if (!delta || !messageID || !partID || field !== "text") continue;
            if (eventSessionID !== sessionId) continue;

            setMessages(prev => {
              const existingMsgIndex = prev.findIndex(m => m.id === messageID);

              const baseMsg: ChatMessage =
                existingMsgIndex >= 0
                  ? prev[existingMsgIndex]
                  : {
                      id: messageID,
                      role: "assistant",
                      content: "",
                      timestamp: new Date(),
                      parts: [],
                      info: { sessionID: eventSessionID },
                    };

              const prevParts = baseMsg.parts ?? [];
              const partIndex = prevParts.findIndex(p => p.id === partID);

              let nextParts: Part[];
              if (partIndex >= 0) {
                const existingPart = prevParts[partIndex] as any;
                if (existingPart.type !== "text" && existingPart.type !== "reasoning") return prev;

                const updatedPart = { ...existingPart, text: (existingPart.text || "") + delta } as Part;

                nextParts = [...prevParts];
                nextParts[partIndex] = updatedPart;
              } else {
                nextParts = [
                  ...prevParts,
                  {
                    id: partID,
                    messageID,
                    sessionID: eventSessionID,
                    type: "text",
                    text: delta,
                  } as any,
                ];
              }

              const nextContent = nextParts
                .map(p => {
                  if (p.type === "text" || p.type === "reasoning") return (p as any).text;
                  return "";
                })
                .join("");

              const nextMsg: ChatMessage = { ...baseMsg, parts: nextParts, content: nextContent };

              if (existingMsgIndex >= 0) {
                const nextMessages = [...prev];
                nextMessages[existingMsgIndex] = nextMsg;
                return nextMessages;
              }

              return [...prev, nextMsg];
            });
          } else if (eventType === "message.part.updated") {
            const { part } = event.properties as { part: Part };
            if (!part) continue;
            if ((part as any).sessionID !== sessionId) continue;

            setMessages(prev => {
              const existingMsgIndex = prev.findIndex(m => m.id === (part as any).messageID);

              const baseMsg: ChatMessage =
                existingMsgIndex >= 0
                  ? prev[existingMsgIndex]
                  : {
                      id: (part as any).messageID,
                      role: "assistant",
                      content: "",
                      timestamp: new Date(),
                      parts: [],
                      info: { sessionID: (part as any).sessionID },
                    };

              const prevParts = baseMsg.parts ?? [];
              const partIndex = prevParts.findIndex(p => p.id === (part as any).id);

              let nextPart: Part = part;
              if (partIndex >= 0) {
                const existingPart = prevParts[partIndex] as any;
                if ((part.type === "text" || part.type === "reasoning") && existingPart.type === part.type) {
                  nextPart = { ...(part as any), text: existingPart.text || (part as any).text } as Part;
                }
              }

              const nextParts = [...prevParts];
              if (partIndex >= 0) nextParts[partIndex] = nextPart;
              else nextParts.push(nextPart);

              const nextContent = nextParts
                .map(p => {
                  if (p.type === "text" || p.type === "reasoning") return (p as any).text || "";
                  return "";
                })
                .join("");

              const nextMsg: ChatMessage = { ...baseMsg, parts: nextParts, content: nextContent };

              if (existingMsgIndex >= 0) {
                const nextMessages = [...prev];
                nextMessages[existingMsgIndex] = nextMsg;
                return nextMessages;
              }

              return [...prev, nextMsg];
            });
          } else if (eventType === "message.updated") {
            const { info } = event.properties as { info: MessageInfo };
            if (info.sessionID !== sessionId) continue;

            setMessages(prev => {
              const msgIndex = prev.findIndex(m => m.id === info.id);
              if (msgIndex >= 0) {
                const updatedMsg = { ...prev[msgIndex] };
                updatedMsg.info = { ...updatedMsg.info, ...info };
                updatedMsg.timestamp = new Date(info.time.created);
                if (info.error) {
                  updatedMsg.content = `${updatedMsg.content}\n\n[错误：${info.error.message}]`;
                }
                const newMessages = [...prev];
                newMessages[msgIndex] = updatedMsg;
                return newMessages;
              }
              const newMessage: ChatMessage = {
                id: info.id,
                role: info.role,
                content: "",
                timestamp: new Date(info.time.created),
                info: { ...info },
              };
              return [...prev, newMessage];
            });
          } else if (eventType === "session.status") {
            const { status, sessionID: statusSessionID } = event.properties as any;
            if (statusSessionID !== sessionId) continue;

            switch (status.type) {
              case "idle":
                setIsLoading(false);
                break;
              case "busy":
                setIsLoading(true);
                setError(null);
                break;
              case "retry":
                setError(`重试中 (${status.attempt}/${status.message})`);
                break;
            }
          } else if (eventType === "session.error") {
            const { error: rawError, sessionID: errorSessionID } = event.properties as any;
            if (errorSessionID && errorSessionID !== sessionId) continue;
            if (rawError) {
              setError(`会话错误：${formatSessionError(rawError)}`);
              setIsLoading(false);
            }
          } else if (eventType === "question.asked") {
            const req = event.properties as any;
            if (!req?.id || req?.sessionID !== sessionId) continue;
            const requestID: string = req.id;
            const questions = normalizeQuestionsForUI(req.questions);
            if (questions.length === 0) continue;
            const tool = req.tool && typeof req.tool === "object" ? req.tool : undefined;

            setMessages(prev => {
              const existingIdx = prev.findIndex(m => m.id === requestID);
              const message: ChatMessage = {
                id: requestID,
                role: "assistant",
                content: "",
                timestamp: new Date(),
                parts: [
                  {
                    id: `question_${requestID}`,
                    messageID: requestID,
                    sessionID: sessionId,
                    type: "question",
                    requestID,
                    questions,
                    tool,
                    state: { status: "pending" },
                  } as QuestionPart,
                ],
                info: { sessionID: sessionId },
              };

              if (existingIdx >= 0) {
                const next = [...prev];
                next[existingIdx] = { ...prev[existingIdx], ...message };
                return next;
              }
              return [...prev, message];
            });
          } else if (eventType === "question.replied") {
            const p = event.properties as any;
            if (p?.sessionID !== sessionId || !p?.requestID) continue;
            const answers = Array.isArray(p.answers) ? (p.answers as Array<Array<string>>) : undefined;
            updateQuestionState(p.requestID, { status: "replied", answers });
          } else if (eventType === "question.rejected") {
            const p = event.properties as any;
            if (p?.sessionID !== sessionId || !p?.requestID) continue;
            updateQuestionState(p.requestID, { status: "rejected" });
          } else if (eventType === "todo.updated") {
            const p = event.properties as any;
            if (p?.sessionID && p.sessionID !== sessionId) continue;
            setTodos(normalizeTodos(p?.todos));
          }
        }
      } catch {
        return;
      } finally {
        isSubscribedRef.current = false;
      }
    };

    setupSSE();

    return () => {
      isCancelled = true;
      stream?.return?.(undefined);
      isSubscribedRef.current = false;
    };
  }, [isOnline, normalizeQuestionsForUI, normalizeTodos, opencodeClient.event, sessionId, updateQuestionState]);

  const sendPrompt = async (seedText: string) => {
    if (!seedText.trim() || !sessionId || isLoading) return false;

    setIsLoading(true);
    setError(null);
    try {
      void ensureSessionTitle(sessionId, seedText);
      const selection =
        readSessionModelSelection(sessionId) ??
        (configProviderID && configModelID ? { providerID: configProviderID, modelID: configModelID } : null);
      console.log("selection", selection);
      await opencodeClient.session.prompt({
        sessionID: sessionId,
        parts: [{ type: "text", text: seedText }],
        agent: agentMode,
        ...(selection ? { model: selection } : {}),
      });
      return true;
    } catch {
      setError(t("chat.error_send_failed"));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    if (messages.length > 0) {
      if (confirm(t("chat.new_chat_confirm"))) {
        await initSession();
      }
    } else {
      await initSession();
    }
  };

  return {
    messages,
    setMessages,
    todos,
    sessionId,
    isLoading,
    error,
    isOnline,

    provider,
    setProvider,
    apiKey,
    setApiKey,
    modelId,
    setModelId,
    agentMode,
    setAgentMode,
    availableProviders,
    isSavingSettings,
    settingsFeedback,

    historySessions,
    isHistoryLoading,
    historyError,
    deletingSessionId,

    agents,
    isAgentsLoading,
    agentsError,

    checkHealth,
    fetchConfig,
    formatHistoryTime,
    fetchSessionHistory,
    loadHistorySession,
    deleteHistorySession,
    handleRenameSession,
    updateSessionTitle,
    handleSaveSettings,
    initSession,
    sendPrompt,
    handleNewChat,
    handleReplyQuestion,
    handleRejectQuestion,
    fetchAgents,
    setHistoryError,
    setIsLoading,
    setError,
    setSettingsFeedback,
    setHistorySessions,
  };
}

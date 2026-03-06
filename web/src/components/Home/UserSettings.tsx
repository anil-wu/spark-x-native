"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Edit3, Plus, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/i18n/client";
import { fileAPI } from "@/lib/file-api";
import type { SparkxSession } from "@/lib/sparkx-session";

type ModelType = "llm" | "vlm" | "embedding";

type LlmProvider = {
  id: number;
  name: string;
  baseUrl: string;
  hasApiKey: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
};

type LlmModel = {
  id: number;
  providerId: number;
  modelName: string;
  modelType: ModelType;
  maxInputTokens: number;
  maxOutputTokens: number;
  supportStream: boolean;
  supportJson: boolean;
  priceInputPer1k: number;
  priceOutputPer1k: number;
  createdAt: string;
  updatedAt: string;
};

type SoftwareTemplate = {
  id: number;
  name: string;
  description: string;
  archiveFileId: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
};

type PagedResponse<T> = {
  list: T[];
  page: { page: number; pageSize: number; total: number };
};

export default function UserSettings({ session }: { session: SparkxSession }) {
  const { t } = useI18n();

  const [providers, setProviders] = useState<LlmProvider[]>([]);
  const [models, setModels] = useState<LlmModel[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");

  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<number | null>(null);
  const [providerForm, setProviderForm] = useState<{
    name: string;
    base_url: string;
    api_key: string;
    clear_api_key: boolean;
    description: string;
  }>({ name: "", base_url: "", api_key: "", clear_api_key: false, description: "" });

  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [editingModelId, setEditingModelId] = useState<number | null>(null);
  const [modelForm, setModelForm] = useState<{
    provider_id: string;
    model_name: string;
    model_type: ModelType;
    max_input_tokens: string;
    max_output_tokens: string;
    support_stream: boolean;
    support_json: boolean;
    price_input_per_1k: string;
    price_output_per_1k: string;
  }>({
    provider_id: "",
    model_name: "",
    model_type: "llm",
    max_input_tokens: "",
    max_output_tokens: "",
    support_stream: true,
    support_json: true,
    price_input_per_1k: "",
    price_output_per_1k: "",
  });

  const [templates, setTemplates] = useState<SoftwareTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [templateForm, setTemplateForm] = useState<{ name: string; description: string }>({ name: "", description: "" });
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateUploading, setTemplateUploading] = useState(false);
  const [templateUploadProgress, setTemplateUploadProgress] = useState(0);

  const providersById = useMemo(() => {
    const map = new Map<number, LlmProvider>();
    for (const p of providers) map.set(p.id, p);
    return map;
  }, [providers]);

  const selectedProvider = useMemo(() => {
    const id = Number(selectedProviderId);
    if (!Number.isFinite(id) || id <= 0) return undefined;
    return providersById.get(id);
  }, [providersById, selectedProviderId]);

  const editingProvider = useMemo(() => {
    if (!editingProviderId) return undefined;
    return providersById.get(editingProviderId);
  }, [editingProviderId, providersById]);

  const selectedModels = useMemo(() => {
    const id = Number(selectedProviderId);
    if (!Number.isFinite(id) || id <= 0) return [];
    return models
      .filter((m) => m.providerId === id)
      .sort((a, b) => a.modelName.localeCompare(b.modelName));
  }, [models, selectedProviderId]);

  const loadProviders = async () => {
    const response = await fetch("/api/llm/providers?page=1&pageSize=200", {
      method: "GET",
      cache: "no-store",
    });
    const payload = (await response.json()) as any;
    if (!response.ok) {
      throw new Error(typeof payload?.error === "string" ? payload.error : "Failed to load providers");
    }
    const list = Array.isArray(payload?.list) ? (payload.list as LlmProvider[]) : [];
    setProviders(list);
    setSelectedProviderId((prev) => {
      if (prev && list.some((p) => String(p.id) === prev)) return prev;
      return list[0]?.id ? String(list[0].id) : "";
    });
  };

  const loadModels = async (providerId: string) => {
    const normalized = Number(providerId);
    if (!Number.isFinite(normalized) || normalized <= 0) {
      setModels([]);
      return;
    }

    const response = await fetch(`/api/llm/models?providerId=${encodeURIComponent(String(normalized))}&page=1&pageSize=500`, {
      method: "GET",
      cache: "no-store",
    });
    const payload = (await response.json()) as any;
    if (!response.ok) {
      throw new Error(typeof payload?.error === "string" ? payload.error : "Failed to load models");
    }
    const list = Array.isArray(payload?.list) ? (payload.list as LlmModel[]) : [];
    setModels(list);
  };

  useEffect(() => {
    void (async () => {
      try {
        await loadProviders();
      } catch (error) {
        alert(error instanceof Error ? error.message : "加载提供商失败");
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedProviderId) {
      setModels([]);
      return;
    }
    void (async () => {
      try {
        await loadModels(selectedProviderId);
      } catch (error) {
        alert(error instanceof Error ? error.message : "加载模型失败");
      }
    })();
  }, [selectedProviderId]);

  const openCreateProvider = () => {
    setEditingProviderId(null);
    setProviderForm({ name: "", base_url: "", api_key: "", clear_api_key: false, description: "" });
    setProviderDialogOpen(true);
  };

  const openEditProvider = (providerId: number) => {
    const p = providersById.get(providerId);
    if (!p) return;
    setEditingProviderId(providerId);
    setProviderForm({
      name: p.name,
      base_url: p.baseUrl ?? "",
      api_key: "",
      clear_api_key: false,
      description: p.description ?? "",
    });
    setProviderDialogOpen(true);
  };

  const saveProvider = async () => {
    if (!session.isSuper) return;

    const trimmedName = providerForm.name.trim();
    if (!trimmedName) return;

    const payload = {
      name: trimmedName,
      baseUrl: providerForm.base_url.trim(),
      apiKey: providerForm.api_key.trim(),
      clearApiKey: providerForm.clear_api_key === true,
      description: providerForm.description.trim(),
    };

    try {
      if (editingProviderId) {
        const response = await fetch(`/api/llm/providers/${editingProviderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = (await response.json()) as any;
        if (!response.ok) throw new Error(typeof result?.error === "string" ? result.error : "保存失败");
      } else {
        const response = await fetch(`/api/llm/providers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = (await response.json()) as any;
        if (!response.ok) throw new Error(typeof result?.error === "string" ? result.error : "保存失败");
      }

      await loadProviders();
      setProviderDialogOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "保存失败");
    }
  };

  const deleteProvider = async (providerId: number) => {
    if (!session.isSuper) return;
    const p = providersById.get(providerId);
    const name = p?.name ? `「${p.name}」` : "";
    const ok = confirm(`确认删除模型提供商${name}吗？将同时删除该提供商下的所有模型。`);
    if (!ok) return;

    try {
      const response = await fetch(`/api/llm/providers/${providerId}`, { method: "DELETE" });
      const result = (await response.json()) as any;
      if (!response.ok) throw new Error(typeof result?.error === "string" ? result.error : "删除失败");
      await loadProviders();
    } catch (error) {
      alert(error instanceof Error ? error.message : "删除失败");
    }
  };

  const openCreateModel = () => {
    const defaultProvider = selectedProviderId || (providers[0]?.id ? String(providers[0].id) : "");
    if (!defaultProvider) return;
    setEditingModelId(null);
    setModelForm({
      provider_id: defaultProvider,
      model_name: "",
      model_type: "llm",
      max_input_tokens: "",
      max_output_tokens: "",
      support_stream: true,
      support_json: true,
      price_input_per_1k: "",
      price_output_per_1k: "",
    });
    setModelDialogOpen(true);
  };

  const openEditModel = (modelId: number) => {
    const m = selectedModels.find((it) => it.id === modelId);
    if (!m) return;
    setEditingModelId(modelId);
    setModelForm({
      provider_id: String(m.providerId),
      model_name: m.modelName,
      model_type: m.modelType,
      max_input_tokens: String(m.maxInputTokens ?? 0),
      max_output_tokens: String(m.maxOutputTokens ?? 0),
      support_stream: m.supportStream ?? false,
      support_json: m.supportJson ?? false,
      price_input_per_1k: String(m.priceInputPer1k ?? 0),
      price_output_per_1k: String(m.priceOutputPer1k ?? 0),
    });
    setModelDialogOpen(true);
  };

  const saveModel = async () => {
    if (!session.isSuper) return;

    const providerId = Number(modelForm.provider_id);
    const modelName = modelForm.model_name.trim();
    if (!Number.isFinite(providerId) || providerId <= 0 || !modelName) return;

    const parseNum = (value: string): number | undefined => {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const n = Number(trimmed);
      if (!Number.isFinite(n)) return undefined;
      return n;
    };

    const createPayload = {
      providerId,
      modelName,
      modelType: modelForm.model_type,
      maxInputTokens: parseNum(modelForm.max_input_tokens) ?? 0,
      maxOutputTokens: parseNum(modelForm.max_output_tokens) ?? 0,
      supportStream: modelForm.support_stream,
      supportJson: modelForm.support_json,
      priceInputPer1k: parseNum(modelForm.price_input_per_1k) ?? 0,
      priceOutputPer1k: parseNum(modelForm.price_output_per_1k) ?? 0,
    };

    const updatePayload: Record<string, unknown> = {
      providerId,
      modelName,
      modelType: modelForm.model_type,
      supportStream: modelForm.support_stream,
      supportJson: modelForm.support_json,
    };
    const maxInputTokens = parseNum(modelForm.max_input_tokens);
    const maxOutputTokens = parseNum(modelForm.max_output_tokens);
    const priceInputPer1k = parseNum(modelForm.price_input_per_1k);
    const priceOutputPer1k = parseNum(modelForm.price_output_per_1k);
    if (typeof maxInputTokens === "number") updatePayload.maxInputTokens = maxInputTokens;
    if (typeof maxOutputTokens === "number") updatePayload.maxOutputTokens = maxOutputTokens;
    if (typeof priceInputPer1k === "number") updatePayload.priceInputPer1k = priceInputPer1k;
    if (typeof priceOutputPer1k === "number") updatePayload.priceOutputPer1k = priceOutputPer1k;

    try {
      if (editingModelId) {
        const response = await fetch(`/api/llm/models/${editingModelId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });
        const result = (await response.json()) as any;
        if (!response.ok) throw new Error(typeof result?.error === "string" ? result.error : "保存失败");
      } else {
        const response = await fetch(`/api/llm/models`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createPayload),
        });
        const result = (await response.json()) as any;
        if (!response.ok) throw new Error(typeof result?.error === "string" ? result.error : "保存失败");
      }

      await loadModels(String(providerId));
      setSelectedProviderId(String(providerId));
      setModelDialogOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "保存失败");
    }
  };

  const deleteModel = async (modelId: number) => {
    if (!session.isSuper) return;
    const target = selectedModels.find((it) => it.id === modelId);
    const ok = confirm(`确认删除模型「${target?.modelName ?? modelId}」吗？`);
    if (!ok) return;

    try {
      const response = await fetch(`/api/llm/models/${modelId}`, { method: "DELETE" });
      const result = (await response.json()) as any;
      if (!response.ok) throw new Error(typeof result?.error === "string" ? result.error : "删除失败");
      if (selectedProviderId) {
        await loadModels(selectedProviderId);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "删除失败");
    }
  };

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const response = await fetch("/api/software-templates?page=1&pageSize=200", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as any;
      if (!response.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Failed to load templates");
      }
      const list = Array.isArray(payload?.list) ? (payload.list as SoftwareTemplate[]) : [];
      setTemplates(list);
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        await loadTemplates();
      } catch (error) {
        alert(error instanceof Error ? error.message : "加载模版失败");
      }
    })();
  }, []);

  const openCreateTemplate = () => {
    setEditingTemplateId(null);
    setTemplateForm({ name: "", description: "" });
    setTemplateFile(null);
    setTemplateUploadProgress(0);
    setTemplateDialogOpen(true);
  };

  const openEditTemplate = (templateId: number) => {
    const target = templates.find((it) => it.id === templateId);
    if (!target) return;
    setEditingTemplateId(templateId);
    setTemplateForm({ name: target.name ?? "", description: target.description ?? "" });
    setTemplateFile(null);
    setTemplateUploadProgress(0);
    setTemplateDialogOpen(true);
  };

  const deleteTemplate = async (templateId: number) => {
    if (!session.isSuper) return;
    const target = templates.find((it) => it.id === templateId);
    const name = target?.name ? `「${target.name}」` : "";
    const ok = confirm(`确认删除游戏模版${name}吗？`);
    if (!ok) return;

    try {
      const response = await fetch(`/api/software-templates/${templateId}`, { method: "DELETE" });
      const result = (await response.json()) as any;
      if (!response.ok) throw new Error(typeof result?.error === "string" ? result.error : "删除失败");
      await loadTemplates();
    } catch (error) {
      alert(error instanceof Error ? error.message : "删除失败");
    }
  };

  const saveTemplate = async () => {
    if (!session.isSuper) return;

    const trimmedName = templateForm.name.trim();
    if (!trimmedName) return;

    const isCreate = !editingTemplateId;
    if (isCreate && !templateFile) {
      alert("请选择模版压缩包");
      return;
    }

    const pickExt = (filename: string): string => {
      const parts = filename.split(".");
      if (parts.length <= 1) return "";
      return parts[parts.length - 1]!.toLowerCase();
    };

    const payload: Record<string, unknown> = { name: trimmedName };
    const trimmedDescription = templateForm.description.trim();
    if (trimmedDescription) payload.description = trimmedDescription;

    try {
      setTemplateUploading(true);
      setTemplateUploadProgress(10);

      if (templateFile) {
        const ext = pickExt(templateFile.name);
        const hash = await fileAPI.calculateHash(templateFile);
        setTemplateUploadProgress(30);

        const preupload = await fileAPI.preUpload(
          0,
          templateFile.name,
          "archive",
          ext || "zip",
          templateFile.size,
          hash,
        );
        if (!preupload) {
          throw new Error("预上传失败");
        }

        setTemplateUploadProgress(60);
        const ok = await fileAPI.uploadToOSS(preupload.uploadUrl, templateFile, preupload.contentType);
        if (!ok) {
          throw new Error("上传到存储失败");
        }

        payload.archiveFileId = preupload.fileId;
      }

      setTemplateUploadProgress(85);
      const response = await fetch(
        editingTemplateId ? `/api/software-templates/${editingTemplateId}` : "/api/software-templates",
        {
          method: editingTemplateId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json()) as any;
      if (!response.ok) {
        throw new Error(typeof result?.error === "string" ? result.error : "保存失败");
      }

      setTemplateUploadProgress(100);
      await loadTemplates();
      setTemplateDialogOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "保存失败");
    } finally {
      setTemplateUploading(false);
      setTemplateUploadProgress(0);
    }
  };

  return (
    <Tabs defaultValue="models" className="space-y-6">
      <TabsList>
        <TabsTrigger value="models">模型管理</TabsTrigger>
        <TabsTrigger value="templates">游戏模版</TabsTrigger>
      </TabsList>

      <TabsContent value="models" className="space-y-6">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">
            {session.isSuper ? t("user_home.settings_admin_title") : t("user_home.settings_title")}
          </CardTitle>
          <CardDescription>管理模型提供商与模型信息（数据来自 api-service）。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">模型提供商</div>
              <div className="text-xs text-slate-500">配置名称、Base URL 与 API Key</div>
            </div>
            {session.isSuper ? (
              <Button onClick={openCreateProvider} size="sm" type="button">
                <Plus />
                新增提供商
              </Button>
            ) : null}
          </div>

          {providers.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">
              还没有配置任何提供商
            </div>
          ) : (
            <div className="grid gap-3">
              {providers.map((p) => {
                return (
                  <div key={p.id} className="rounded-xl border bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                          <div className="text-xs text-slate-500">({p.id})</div>
                        </div>
                        <div className="mt-1 text-xs text-slate-600 truncate">
                          {p.baseUrl ? `Base URL: ${p.baseUrl}` : "Base URL: 未设置"}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">API Key: {p.hasApiKey ? "已设置" : "未设置"}</div>
                      </div>
                      {session.isSuper ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="icon"
                            type="button"
                            onClick={() => openEditProvider(p.id)}
                            aria-label="编辑提供商"
                          >
                            <Edit3 />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            type="button"
                            onClick={() => deleteProvider(p.id)}
                            aria-label="删除提供商"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="h-px bg-slate-200" />

          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">模型</div>
              <div className="text-xs text-slate-500">为指定提供商维护模型列表与能力</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-[220px]">
                <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择提供商" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {session.isSuper ? (
                <Button onClick={openCreateModel} size="sm" type="button" disabled={!selectedProviderId}>
                  <Plus />
                  新增模型
                </Button>
              ) : null}
            </div>
          </div>

          {!selectedProviderId ? (
            <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">
              请选择一个提供商来管理模型
            </div>
          ) : selectedModels.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">
              当前提供商还没有配置模型
            </div>
          ) : (
            <div className="grid gap-3">
              {selectedModels.map((m) => (
                <div key={m.id} className="rounded-xl border bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{m.modelName}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        类型: {m.modelType ?? "llm"}，输入: {m.maxInputTokens ?? 0}，输出: {m.maxOutputTokens ?? 0}
                      </div>
                      <div className="mt-1 text-xs text-slate-600 flex items-center gap-3">
                        <span>流式: {m.supportStream ? "支持" : "不支持"}</span>
                        <span>JSON: {m.supportJson ? "支持" : "不支持"}</span>
                      </div>
                    </div>
                    {session.isSuper ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          type="button"
                          onClick={() => openEditModel(m.id)}
                          aria-label="编辑模型"
                        >
                          <Edit3 />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          type="button"
                          onClick={() => deleteModel(m.id)}
                          aria-label="删除模型"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="templates" className="space-y-6">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">游戏模版</CardTitle>
          <CardDescription>管理游戏模版（用于创建软件工程的初始模板）。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">模版列表</div>
              <div className="text-xs text-slate-500">支持 zip 等压缩包格式</div>
            </div>
            {session.isSuper ? (
              <Button onClick={openCreateTemplate} size="sm" type="button">
                <Upload />
                上传模版
              </Button>
            ) : null}
          </div>

          {templatesLoading ? (
            <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">加载中...</div>
          ) : templates.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">
              还没有配置任何模版
            </div>
          ) : (
            <div className="grid gap-3">
              {templates
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((tpl) => (
                  <div key={tpl.id} className="rounded-xl border bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-slate-900 truncate">{tpl.name}</div>
                          <div className="text-xs text-slate-500">({tpl.id})</div>
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          {tpl.description ? tpl.description : "暂无描述"}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          {tpl.archiveFileId ? (
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              onClick={() => window.open(`/api/files/${tpl.archiveFileId}/content`, "_blank")}
                            >
                              <Download />
                              下载压缩包
                            </Button>
                          ) : (
                            <div className="text-xs text-slate-500">未绑定压缩包</div>
                          )}
                        </div>
                      </div>

                      {session.isSuper ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="icon"
                            type="button"
                            onClick={() => openEditTemplate(tpl.id)}
                            aria-label="编辑模版"
                          >
                            <Edit3 />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            type="button"
                            onClick={() => deleteTemplate(tpl.id)}
                            aria-label="删除模版"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
      </TabsContent>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editingTemplateId ? "编辑游戏模版" : "上传游戏模版"}</DialogTitle>
            <DialogDescription>
              {editingTemplateId ? "可更新名称/描述，或重新上传压缩包。" : "上传压缩包并创建模版记录。"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="template_name">模版名称</Label>
              <Input
                id="template_name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="例如 phaser-blank"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="template_description">描述</Label>
              <Input
                id="template_description"
                value={templateForm.description}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="可选"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="template_file">压缩包</Label>
              <Input
                id="template_file"
                type="file"
                accept=".zip,.tar,.gz,.tgz,.rar,.7z"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setTemplateFile(file);
                  if (file && !templateForm.name.trim()) {
                    const withoutExt = file.name.replace(/\.[^/.]+$/, "");
                    setTemplateForm((prev) => ({ ...prev, name: withoutExt }));
                  }
                }}
              />
              {editingTemplateId ? (
                <div className="text-xs text-slate-500">不选文件则仅更新名称/描述</div>
              ) : (
                <div className="text-xs text-slate-500">创建时必须选择文件</div>
              )}
            </div>

            {templateUploading ? (
              <div className="text-xs text-slate-600">上传中... {templateUploadProgress}%</div>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" type="button" onClick={() => setTemplateDialogOpen(false)} disabled={templateUploading}>
              取消
            </Button>
            <Button type="button" onClick={saveTemplate} disabled={!session.isSuper || templateUploading || !templateForm.name.trim()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={providerDialogOpen} onOpenChange={setProviderDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editingProviderId ? "编辑提供商" : "新增提供商"}</DialogTitle>
            <DialogDescription>提供商信息将写入 api-service（仅超级账号可写）。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="provider-name">名称</Label>
              <Input
                id="provider-name"
                value={providerForm.name}
                onChange={(e) => setProviderForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="例如：OpenRouter"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="provider-baseurl">Base URL</Label>
              <Input
                id="provider-baseurl"
                value={providerForm.base_url}
                onChange={(e) => setProviderForm((prev) => ({ ...prev, base_url: e.target.value }))}
                placeholder="例如：https://openrouter.ai/api/v1"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="provider-apikey">API Key</Label>
              <Input
                id="provider-apikey"
                type="password"
                value={providerForm.api_key}
                onChange={(e) => setProviderForm((prev) => ({ ...prev, api_key: e.target.value }))}
                placeholder={editingProviderId && editingProvider?.hasApiKey ? "已设置（留空不修改）" : "可选"}
                disabled={providerForm.clear_api_key === true}
              />
            </div>
            {editingProviderId && editingProvider?.hasApiKey ? (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <Checkbox
                  checked={providerForm.clear_api_key}
                  onCheckedChange={(v) => setProviderForm((prev) => ({ ...prev, clear_api_key: v === true }))}
                />
                清空 API Key
              </label>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="provider-desc">描述</Label>
              <textarea
                id="provider-desc"
                value={providerForm.description}
                onChange={(e) => setProviderForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="可选"
                className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" type="button" onClick={() => setProviderDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={saveProvider} disabled={!session.isSuper}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editingModelId ? "编辑模型" : "新增模型"}</DialogTitle>
            <DialogDescription>模型信息将写入 api-service（仅超级账号可写）。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>提供商</Label>
              <Select value={modelForm.provider_id} onValueChange={(v) => setModelForm((prev) => ({ ...prev, provider_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="选择提供商" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="model-id">模型 ID</Label>
              <Input
                id="model-id"
                value={modelForm.model_name}
                onChange={(e) => setModelForm((prev) => ({ ...prev, model_name: e.target.value }))}
                placeholder="例如：qwen/qwen-max"
              />
            </div>
            <div className="grid gap-2">
              <Label>模型类型</Label>
              <Select value={modelForm.model_type} onValueChange={(v) => setModelForm((prev) => ({ ...prev, model_type: v as ModelType }))}>
                <SelectTrigger>
                  <SelectValue placeholder="选择模型类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="llm">llm</SelectItem>
                  <SelectItem value="vlm">vlm</SelectItem>
                  <SelectItem value="embedding">embedding</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="max-in">最大输入 Token</Label>
                <Input
                  id="max-in"
                  value={modelForm.max_input_tokens}
                  onChange={(e) => setModelForm((prev) => ({ ...prev, max_input_tokens: e.target.value }))}
                  placeholder="例如：32768"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="max-out">最大输出 Token</Label>
                <Input
                  id="max-out"
                  value={modelForm.max_output_tokens}
                  onChange={(e) => setModelForm((prev) => ({ ...prev, max_output_tokens: e.target.value }))}
                  placeholder="例如：8192"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="price-in">输入价格（每 1k）</Label>
                <Input
                  id="price-in"
                  value={modelForm.price_input_per_1k}
                  onChange={(e) => setModelForm((prev) => ({ ...prev, price_input_per_1k: e.target.value }))}
                  placeholder="例如：0.002"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price-out">输出价格（每 1k）</Label>
                <Input
                  id="price-out"
                  value={modelForm.price_output_per_1k}
                  onChange={(e) => setModelForm((prev) => ({ ...prev, price_output_per_1k: e.target.value }))}
                  placeholder="例如：0.006"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <Checkbox
                  checked={modelForm.support_stream}
                  onCheckedChange={(v) => setModelForm((prev) => ({ ...prev, support_stream: v === true }))}
                />
                支持流式
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <Checkbox checked={modelForm.support_json} onCheckedChange={(v) => setModelForm((prev) => ({ ...prev, support_json: v === true }))} />
                支持 JSON
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" type="button" onClick={() => setModelDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={saveModel} disabled={!session.isSuper || !modelForm.provider_id || !modelForm.model_name.trim()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}


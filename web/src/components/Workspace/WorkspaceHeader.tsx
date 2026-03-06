"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect } from "react";

import { PenTool, Gamepad2, Code2, Home } from "lucide-react";
import LanguageSwitcher from "@/components/I18n/LanguageSwitcher";
import { useI18n } from "@/i18n/client";

type WorkspaceHeaderProps = {
  projectId?: string;
  viewMode?: 'resource' | 'preview' | 'code' | 'intro';
  onViewModeChange?: (mode: 'resource' | 'preview' | 'code' | 'intro') => void;
};

export default function WorkspaceHeader({
  projectId,
  viewMode = 'resource',
  onViewModeChange,
}: WorkspaceHeaderProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const { t } = useI18n();

  // 获取项目信息
  useEffect(() => {
    const fetchProjectInfo = async () => {
      if (!projectId) return;
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
          const data = await response.json();
          setProjectName(data.name || '');
        }
      } catch (error) {
        console.error("Failed to fetch project info:", error);
      }
    };

    fetchProjectInfo();
  }, [projectId]);

  const handleGoHome = () => {
    router.push("/home");
  };

  const handleGoProjectIntro = () => {
    if (projectId) {
      router.push(`/projects/${projectId}`);
    }
  };

  const handleSignOut = () => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/sparkx/auth/logout", {
          method: "POST",
        });

        if (!response.ok) {
          setError(t("auth.sign_out_failed"));
        }
      } catch {
        setError(t("auth.sign_out_failed"));
      } finally {
        window.location.href = "/login";
      }
    });
  };

  return (
    <div className="relative flex items-center justify-center w-full">
      {/* 左侧：主页按钮和项目名称 */}
      <div className="absolute left-0 flex items-center gap-2">
        <button
          type="button"
          onClick={handleGoHome}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Home size={14} />
          {t("workspace.home")}
        </button>
        <span className="text-sm font-medium text-slate-600 px-2 py-1">
          {projectName || t("projects.untitled_project")}
        </span>
      </div>

      {/* 中间：标签页 */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => onViewModeChange?.('intro')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'intro'
              ? 'bg-white shadow-sm text-gray-900'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          {t("workspace.project_info")}
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => onViewModeChange?.('resource')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'resource'
              ? 'bg-white shadow-sm text-gray-900'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <PenTool size={14} />
          {t("workspace.resource")}
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange?.('code')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'code'
              ? 'bg-white shadow-sm text-gray-900'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Code2 size={14} />
          {t("workspace.code")}
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange?.('preview')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'preview'
              ? 'bg-white shadow-sm text-gray-900'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Gamepad2 size={14} />
          {t("workspace.preview")}
        </button>
      </div>

      {/* 左侧：错误信息 */}
      {error && (
        <div className="absolute left-0 top-full mt-2">
          <span className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-700">
            {error}
          </span>
        </div>
      )}

      {/* 右侧：用户信息 */}
      <div className="absolute right-0">
        <div className="flex items-center gap-2">
          <LanguageSwitcher className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50" />
          <button
            type="button"
            onClick={handleSignOut}
            disabled={pending}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? t("auth.signing_out") : t("auth.sign_out")}
          </button>
        </div>
      </div>
    </div>
  );
}

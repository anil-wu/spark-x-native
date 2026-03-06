"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Calendar, Clock, FileText, Pencil, Save } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { getProjectById, updateProjectById, uploadProjectCover } from "@/lib/projects-api";
import type { Project } from "@/lib/projects";

interface ProjectIntroPanelProps {
  projectId?: string;
}

export default function ProjectIntroPanel({ projectId }: ProjectIntroPanelProps) {
  const { t } = useI18n();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [coverFileId, setCoverFileId] = useState<number | null>(null);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadProject = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const detail = await getProjectById(projectId);
        if (!cancelled) {
          setProject(detail);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load project");
          setProject(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProject();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!project) return;
    setDraftName(project.name ?? "");
    setDraftDescription(project.description ?? "");
    setCoverFileId(null);
    setCoverPreviewUrl(null);
    setIsEditing(false);
    setIsCoverUploading(false);
    setIsSaving(false);
    setLoadError(null);
    setActionError(null);
  }, [project]);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [coverPreviewUrl]);

  const createdAtLabel = useMemo(() => {
    if (!project?.createdAt) return null;
    const date = new Date(project.createdAt);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString();
  }, [project?.createdAt]);

  const updatedAtLabel = useMemo(() => {
    if (!project?.updatedAt) return null;
    const date = new Date(project.updatedAt);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString();
  }, [project?.updatedAt]);

  const normalizedDraftName = useMemo(() => draftName.trim(), [draftName]);
  const normalizedDraftDescription = useMemo(() => draftDescription ?? "", [draftDescription]);

  const hasChanges = useMemo(() => {
    if (!project) return false;
    return (
      normalizedDraftName !== (project.name ?? "") ||
      normalizedDraftDescription !== (project.description ?? "") ||
      coverFileId !== null
    );
  }, [coverFileId, normalizedDraftDescription, normalizedDraftName, project]);

  const canSave = useMemo(() => {
    if (!projectId || !project) return false;
    if (isSaving || isCoverUploading) return false;
    if (!hasChanges) return false;
    if (!normalizedDraftName) return false;
    return true;
  }, [hasChanges, isCoverUploading, isSaving, normalizedDraftName, project, projectId]);

  const handleCoverClick = useCallback(() => {
    if (!projectId) return;
    coverFileInputRef.current?.click();
  }, [projectId]);

  const handleCoverFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!projectId) return;
      const file = e.target.files?.[0] ?? null;
      e.target.value = "";
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setActionError(t("projects.create_dialog.cover_invalid"));
        return;
      }

      setIsEditing(true);
      setActionError(null);
      const nextPreviewUrl = URL.createObjectURL(file);
      setCoverPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return nextPreviewUrl;
      });

      try {
        setIsCoverUploading(true);
        const nextCoverFileId = await uploadProjectCover(projectId, file);
        setCoverFileId(nextCoverFileId);
      } catch (err) {
        setCoverFileId(null);
        setActionError(
          err instanceof Error ? err.message : t("project_info.upload_cover_failed"),
        );
      } finally {
        setIsCoverUploading(false);
      }
    },
    [projectId, t],
  );

  const handleActionClick = useCallback(async () => {
    if (!project) return;
    if (!projectId) return;

    if (!isEditing) {
      setIsEditing(true);
      setActionError(null);
      return;
    }

    if (!hasChanges) {
      setIsEditing(false);
      setDraftName(project.name ?? "");
      setDraftDescription(project.description ?? "");
      setCoverFileId(null);
      setCoverPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setActionError(null);
      return;
    }

    if (!canSave) return;

    try {
      setIsSaving(true);
      setActionError(null);
      await updateProjectById(projectId, {
        name: normalizedDraftName,
        description: normalizedDraftDescription,
        ...(coverFileId !== null ? { coverFileId } : {}),
      });
      const refreshed = await getProjectById(projectId);
      setProject(refreshed);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("project_info.save_failed"));
    } finally {
      setIsSaving(false);
    }
  }, [
    canSave,
    coverFileId,
    hasChanges,
    isEditing,
    normalizedDraftDescription,
    normalizedDraftName,
    project,
    projectId,
    t,
  ]);

  const actionLabel = useMemo(() => {
    if (isSaving) return t("project_info.saving");
    if (hasChanges) return t("project_info.save");
    return t("project_info.edit");
  }, [hasChanges, isSaving, t]);

  const actionIcon = useMemo(() => {
    if (isSaving) return null;
    if (hasChanges) return <Save size={16} />;
    return <Pencil size={16} />;
  }, [hasChanges, isSaving]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <p className="text-sm">{t("project_info.loading")}</p>
        </div>
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <p className="text-sm font-medium">{t("project_info.load_failed")}</p>
          {loadError && <p className="text-xs mt-2 text-red-500">{loadError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden bg-gray-50">
      <div className="mx-auto w-full max-w-4xl p-8 overflow-y-auto">
        {/* Project Cover Image */}
        <input
          ref={coverFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCoverFileChange}
        />
        {project.coverImage || coverPreviewUrl ? (
          <div
            className="group mb-6 cursor-pointer rounded-2xl overflow-hidden shadow-lg relative"
            onClick={handleCoverClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleCoverClick();
            }}
          >
            <img
              src={coverPreviewUrl ?? project.coverImage}
              alt={project.name}
              className="w-full h-64 object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white">
                {isCoverUploading
                  ? t("project_info.uploading_cover")
                  : t("project_info.change_cover")}
              </span>
            </div>
          </div>
        ) : (
          <div
            className="group mb-6 cursor-pointer rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 h-64 flex items-center justify-center shadow-lg relative"
            onClick={handleCoverClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleCoverClick();
            }}
          >
            <ImageIcon className="text-white/80" size={64} />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white">
                {isCoverUploading
                  ? t("project_info.uploading_cover")
                  : t("project_info.change_cover")}
              </span>
            </div>
          </div>
        )}

        {/* Project Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {/* Project Name */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="w-full text-3xl font-semibold text-gray-900 outline-none border-b border-gray-200 focus:border-gray-400 bg-transparent pb-1"
                />
              ) : (
                <h1 className="text-3xl font-semibold text-gray-900">
                  {project.name}
                </h1>
              )}
            </div>

            <button
              type="button"
              onClick={handleActionClick}
              disabled={isSaving || isCoverUploading || (isEditing && hasChanges && !canSave)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {actionIcon}
              {actionLabel}
            </button>
          </div>

          {/* Project Description */}
          <div className="mt-4">
            <div className="flex items-center gap-2 text-gray-700 mb-2">
              <FileText size={18} className="text-gray-500" />
              <span className="font-medium">{t("project_info.description")}</span>
            </div>
            {isEditing ? (
              <textarea
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-gray-400"
              />
            ) : (
              <p className="text-gray-600 leading-relaxed pl-6">
                {project.description || t("project_info.no_description")}
              </p>
            )}
          </div>

          {/* Project Metadata */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {createdAtLabel && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Calendar size={18} className="text-gray-400" />
                  <div>
                    <span className="text-gray-500">{t("project_info.created_at_label")}</span>
                    <p className="font-medium text-gray-900">{createdAtLabel}</p>
                  </div>
                </div>
              )}
              {updatedAtLabel && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Clock size={18} className="text-gray-400" />
                  <div>
                    <span className="text-gray-500">{t("project_info.updated_at_label")}</span>
                    <p className="font-medium text-gray-900">{updatedAtLabel}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {actionError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        )}
      </div>
    </div>
  );
}

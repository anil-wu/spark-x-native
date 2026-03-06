"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  BookOpenText,
  Clock,
  FilePlus2,
  Flame,
  Gamepad2,
  Play,
  Plus,
  Rocket,
  Sparkles,
  Star,
  Trash2,
  Users,
} from "lucide-react";

import { useI18n } from "@/i18n/client";
import { type Project } from "@/lib/projects";
import {
  deleteProjectById,
  listProjects,
} from "@/lib/projects-api";
import type { SparkxSession } from "@/lib/sparkx-session";

type UserHomeProps = {
  session: SparkxSession;
};

const pickFallbackCover = (index: number) => {
  const covers = [
    "/revamp/cover1.jpg",
    "/revamp/cover2.jpg",
    "/revamp/cover3.jpg",
    "/revamp/cover4.jpg",
    "/revamp/cover5.jpg",
    "/revamp/cover6.jpg",
  ];
  return covers[index % covers.length]!;
};

export default function UserHome({ session }: UserHomeProps) {
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await listProjects();
      setProjects(loaded);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : t("projects.empty"),
      );
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadProjects();

    const handleProjectCreated = () => {
      void loadProjects();
    };

    window.addEventListener("project-created", handleProjectCreated);
    return () => {
      window.removeEventListener("project-created", handleProjectCreated);
    };
  }, [loadProjects]);

  const hydratedProjects = projects.map((project, index) => ({
    ...project,
    coverImage: project.coverImage || pickFallbackCover(index),
  }));

  const recentProjects = hydratedProjects.slice(0, 3);

  const handleDeleteProject = async (projectId: string) => {
    setError(null);
    try {
      await deleteProjectById(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setDeleteConfirmId(null);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : t("projects.empty"),
      );
    }
  };

  const confirmDelete = (projectId: string) => {
    setDeleteConfirmId(projectId);
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const handleOpenCreateDialog = () => {
    window.dispatchEvent(new CustomEvent("open-create-project"));
  };

  return (
    <>
      <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-lg transition-all hover:shadow-xl hover:shadow-orange-500/20">
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-white/10" />
            <div className="relative">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Gamepad2 className="h-6 w-6" />
              </div>
              <div className="text-3xl font-bold">{projects.length}</div>
              <div className="mt-1 text-sm text-orange-100">
                {t("user_home.stats.projects")}
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg transition-all hover:shadow-xl hover:shadow-blue-500/20">
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-white/10" />
            <div className="relative">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Flame className="h-6 w-6" />
              </div>
              <div className="text-3xl font-bold">12</div>
              <div className="mt-1 text-sm text-blue-100">
                {t("user_home.stats.active_days")}
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white shadow-lg transition-all hover:shadow-xl hover:shadow-purple-500/20">
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-white/10" />
            <div className="relative">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Star className="h-6 w-6" />
              </div>
              <div className="text-3xl font-bold">5</div>
              <div className="mt-1 text-sm text-purple-100">
                {t("user_home.stats.completed")}
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-lg transition-all hover:shadow-xl hover:shadow-emerald-500/20">
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-white/10" />
            <div className="relative">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Users className="h-6 w-6" />
              </div>
              <div className="text-3xl font-bold">1.2k</div>
              <div className="mt-1 text-sm text-emerald-100">
                {t("user_home.stats.views")}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {t("user_home.recent_projects.title")}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {t("user_home.recent_projects.subtitle")}
              </p>
            </div>
            <Link
              href="/projects"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              {t("user_home.recent_projects.view_all")}
            </Link>
          </div>

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-2xl bg-slate-200"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
              <FilePlus2 className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-lg font-medium text-slate-900">
                {t("projects.empty")}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {t("user_home.recent_projects.empty_hint")}
              </p>
              <button
                type="button"
                onClick={handleOpenCreateDialog}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                {t("projects.create_first")}
              </button>
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
              <FilePlus2 className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-lg font-medium text-slate-900">
                {t("projects.empty")}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {t("user_home.recent_projects.empty_hint")}
              </p>
              <button
                type="button"
                onClick={handleOpenCreateDialog}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                {t("projects.create_first")}
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}/edit`}
                  className="group relative overflow-hidden rounded-2xl bg-white shadow-sm transition-all hover:shadow-lg hover:shadow-slate-200/50"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                    {project.coverImage ? (
                      <Image
                        src={project.coverImage}
                        alt={project.name}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
                        <Gamepad2 className="h-12 w-12 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900 group-hover:text-orange-600">
                      {project.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {project.description}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(project.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            confirmDelete(project.id);
                          }}
                          className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-red-600"
                          title={t("projects.delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mb-10">
          <h2 className="mb-6 text-xl font-semibold text-slate-900">
            {t("user_home.quick_start.title")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/projects"
              className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-orange-300 hover:shadow-lg hover:shadow-orange-500/10"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 transition-colors group-hover:bg-orange-200">
                <Rocket className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-slate-900">
                {t("user_home.quick_start.continue")}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {t("user_home.quick_start.continue_desc")}
              </p>
            </Link>

            <Link
              href="/projects"
              className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 transition-colors group-hover:bg-blue-200">
                <BookOpenText className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900">
                {t("user_home.quick_start.tutorials")}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {t("user_home.quick_start.tutorials_desc")}
              </p>
            </Link>

            <Link
              href="/projects"
              className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-purple-300 hover:shadow-lg hover:shadow-purple-500/10"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 transition-colors group-hover:bg-purple-200">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-900">
                {t("user_home.quick_start.templates")}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {t("user_home.quick_start.templates_desc")}
              </p>
            </Link>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white shadow-xl">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {t("user_home.featured.title")}
              </h2>
              <p className="mt-2 text-slate-300">
                {t("user_home.featured.subtitle")}
              </p>
            </div>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              <Play className="h-5 w-5" />
              {t("user_home.featured.explore")}
            </Link>
          </div>
        </div>

        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {t("projects.delete_confirm_title")}
                </h3>
              </div>
              <p className="mb-6 text-slate-600">
                {t("projects.delete_confirm_message")}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {t("projects.create_dialog.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteProject(deleteConfirmId)}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700"
                >
                  {t("projects.delete")}
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}

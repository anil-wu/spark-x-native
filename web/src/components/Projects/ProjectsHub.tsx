"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpenText, Plus, Rocket, Trash2 } from "lucide-react";

import CreateProjectDialog from "@/components/Projects/CreateProjectDialog";
import { useI18n } from "@/i18n/client";
import { type Project } from "@/lib/projects";
import {
  createProject,
  deleteProjectById,
  listProjects,
  uploadProjectCover,
  updateProjectById,
} from "@/lib/projects-api";

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

export default function ProjectsHub() {
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    const handleCreated = () => {
      void loadProjects();
    };

    window.addEventListener("project-created", handleCreated);
    return () => {
      window.removeEventListener("project-created", handleCreated);
    };
  }, [loadProjects]);

  const hydratedProjects = useMemo(
    () =>
      projects.map((project, index) => ({
        ...project,
        coverImage: project.coverImage || pickFallbackCover(index),
      })),
    [projects],
  );

  const handleCreateProject = async (input?: {
    name?: string;
    coverImage?: string;
    coverFile?: File;
  }) => {
    setError(null);
    setIsCreatingProject(true);
    try {
      const project = await createProject({
        name: input?.name || t("projects.untitled_project"),
        description: t("projects.untitled_description"),
      });

      let coverImage = input?.coverImage || project.coverImage;
      if (input?.coverFile) {
        const coverFileId = await uploadProjectCover(project.id, input.coverFile);
        await updateProjectById(project.id, {
          name: project.name,
          description: project.description,
          coverFileId,
        });
        coverImage = `/api/files/${coverFileId}/content`;
      }

      setProjects((prev) => [
        {
          ...project,
          coverImage,
        },
        ...prev,
      ]);
      setIsCreateDialogOpen(false);
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : t("projects.empty"),
      );
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setError(null);
    try {
      await deleteProjectById(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : t("projects.empty"),
      );
    }
  };

  const handleResetDemo = async () => {
    await handleCreateProject();
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {t("projects.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("projects.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsCreateDialogOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            {t("projects.new_project")}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="mt-16 rounded-3xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-600">{t("projects.empty")}</p>
        </div>
      ) : hydratedProjects.length === 0 ? (
        <div className="mt-16 rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-600">{t("projects.empty")}</p>
          <button
            type="button"
            onClick={() => {
              setIsCreateDialogOpen(true);
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            {t("projects.create_first")}
          </button>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {hydratedProjects.map((project, index) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}/edit`}
              className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                <div
                  className="absolute inset-0 bg-cover bg-center transition duration-300 group-hover:scale-[1.02]"
                  style={{ backgroundImage: `url(${project.coverImage})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0" />
              </div>

              <div className="space-y-3 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold text-slate-900 group-hover:text-orange-600">
                      {project.name}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {project.description || t("projects.no_description")}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void handleDeleteProject(project.id);
                    }}
                    className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-red-600"
                    aria-label={t("projects.delete")}
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

      <div className="mt-10 flex items-center justify-center">
        <button
          type="button"
          onClick={() => {
            void handleResetDemo();
          }}
          className="text-xs font-medium text-slate-400 transition hover:text-slate-600"
        >
          {t("projects.reset_demo")}
        </button>
      </div>

      <CreateProjectDialog
        isOpen={isCreateDialogOpen}
        isSubmitting={isCreatingProject}
        onCancel={() => {
          setIsCreateDialogOpen(false);
        }}
        onSubmit={(input) => handleCreateProject(input)}
      />
    </div>
  );
}

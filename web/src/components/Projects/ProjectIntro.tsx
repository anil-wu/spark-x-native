"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpenText, Rocket } from "lucide-react";

import { useI18n } from "@/i18n/client";
import { type Project } from "@/lib/projects";
import { getProjectById } from "@/lib/projects-api";

type ProjectIntroProps = {
  projectId: string;
};

export default function ProjectIntro({ projectId }: ProjectIntroProps) {
  const { t } = useI18n();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadProject = async () => {
      try {
        const detail = await getProjectById(projectId);
        if (!cancelled) {
          setProject(detail);
        }
      } catch {
        if (!cancelled) {
          setProject(null);
        }
      }
    };

    void loadProject();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

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

  if (!project) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 pb-16 pt-10">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("project_intro.back_to_projects")}
        </Link>
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            {t("project_intro.not_found_title")}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {t("project_intro.not_found_desc")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 pb-16 pt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("project_intro.back_to_projects")}
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
            {project.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            {project.description || t("project_intro.no_description")}
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
            {createdAtLabel && (
              <span className="rounded-full bg-slate-100 px-3 py-1">
                {t("project_intro.created_at", { value: createdAtLabel })}
              </span>
            )}
            {updatedAtLabel && (
              <span className="rounded-full bg-slate-100 px-3 py-1">
                {t("project_intro.updated_at", { value: updatedAtLabel })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${project.id}/edit`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Rocket className="h-4 w-4" />
            {t("project_intro.open_editor")}
          </Link>
          <Link
            href={`/projects/${project.id}/edit?panel=project`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <BookOpenText className="h-4 w-4" />
            {t("project_intro.view_assets")}
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              {t("project_intro.about_title")}
            </h2>
          </div>
          <div className="space-y-4 px-6 py-6 text-sm text-slate-600">
            <p>{t("project_intro.about_body_1")}</p>
            <p>{t("project_intro.about_body_2")}</p>
            <p>{t("project_intro.about_body_3")}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              {t("project_intro.gallery_title")}
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3 p-6">
            {[
              "/revamp/game1.gif",
              "/revamp/game2.jpg",
              "/revamp/game3.jpg",
              "/revamp/game4.jpg",
              "/revamp/game5.png",
              "/revamp/game6.jpg",
            ].map((src) => (
              <div
                key={src}
                className="aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100"
              >
                <div
                  className="h-full w-full bg-cover bg-center transition duration-300 hover:scale-[1.03]"
                  style={{ backgroundImage: `url(${src})` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

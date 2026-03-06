"use client";

import Link from "next/link";

import { useI18n } from "@/i18n/client";

export default function ProjectEditorHeader({ projectId }: { projectId: string }) {
  const { t } = useI18n();

  return (
    <Link
      href={`/projects/${projectId}`}
      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
    >
      {t("projects.intro")}
    </Link>
  );
}

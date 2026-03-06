"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Folder,
  Home,
  Plus,
  Settings,
  User,
} from "lucide-react";

import CreateProjectDialog from "@/components/Projects/CreateProjectDialog";
import { useI18n } from "@/i18n/client";
import {
  createProject,
  uploadProjectCover,
  updateProjectById,
} from "@/lib/projects-api";

interface UserNavigationProps {
  activeTab?: "home" | "projects" | "settings";
  onTabChange?: (tab: "home" | "projects" | "settings") => void;
}

export default function UserNavigation({
  activeTab,
  onTabChange,
}: UserNavigationProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsCreateDialogOpen(true);
    window.addEventListener("open-create-project", handleOpen);
    return () => window.removeEventListener("open-create-project", handleOpen);
  }, []);

  const handleCreateProject = async (input?: {
    name?: string;
    coverImage?: string;
    coverFile?: File;
  }) => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const project = await createProject({
        name: input?.name || t("projects.untitled_project"),
        description: t("projects.untitled_description"),
      });

      if (input?.coverFile) {
        const coverFileId = await uploadProjectCover(project.id, input.coverFile);
        await updateProjectById(project.id, {
          name: project.name,
          description: project.description,
          coverFileId,
        });
      }

      window.dispatchEvent(new CustomEvent("project-created"));
      setIsCreateDialogOpen(false);
      router.push(`/projects/${project.id}/edit`);
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDirectCreate = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const project = await createProject({
        name: t("projects.untitled_project"),
        description: t("projects.untitled_description"),
      });
      router.push(`/projects/${project.id}/edit`);
    } catch (error) {
      console.error("Failed to create project:", error);
      setIsCreating(false);
    }
  };

  const handleNav = (e: React.MouseEvent, tab: "home" | "projects" | "settings") => {
    if (onTabChange) {
      e.preventDefault();
      onTabChange(tab);
    }
  };

  return (
    <>
      <div className="fixed left-6 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-center gap-6 rounded-full bg-white px-3 py-6 shadow-xl ring-1 ring-slate-900/5 backdrop-blur-sm transition-all hover:scale-[1.02] lg:flex">
        <button
          type="button"
          onClick={handleDirectCreate}
          disabled={isCreating}
          className="group relative flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800 hover:shadow-slate-900/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          title={t("sidebar.create_project")}
        >
          <Plus className={`h-6 w-6 transition-transform ${isCreating ? "animate-spin" : "group-hover:rotate-90"}`} />
        </button>

        <div className="h-px w-8 bg-slate-100" />

        <Link
          href="/home"
          onClick={(e) => handleNav(e, "home")}
          className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
            activeTab === "home"
              ? "bg-orange-50 text-orange-600"
              : "text-slate-500 hover:bg-orange-50 hover:text-orange-600"
          }`}
          title={t("sidebar.home")}
        >
          <Home className="h-5 w-5" />
        </Link>

        <Link
          href="/projects"
          onClick={(e) => handleNav(e, "projects")}
          className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
            activeTab === "projects"
              ? "bg-blue-50 text-blue-600"
              : "text-slate-500 hover:bg-blue-50 hover:text-blue-600"
          }`}
          title={t("sidebar.my_projects")}
        >
          <Folder className="h-5 w-5" />
        </Link>

        <Link
          href="#"
          className="group relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-purple-50 hover:text-purple-600"
          title={t("sidebar.user_info")}
        >
          <User className="h-5 w-5" />
        </Link>

        <Link
          href="/home"
          onClick={(e) => handleNav(e, "settings")}
          className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
            activeTab === "settings"
              ? "bg-slate-100 text-slate-700"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          }`}
          title={t("sidebar.settings")}
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>

      <CreateProjectDialog
        isOpen={isCreateDialogOpen}
        isSubmitting={isCreating}
        onCancel={() => {
          setIsCreateDialogOpen(false);
        }}
        onSubmit={(input) => handleCreateProject(input)}
      />
    </>
  );
}

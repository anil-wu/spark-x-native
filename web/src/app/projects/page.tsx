import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Home } from "lucide-react";
import Link from "next/link";

import AuthControls from "@/components/Auth/AuthControls";
import ProjectsHub from "@/components/Projects/ProjectsHub";
import { getRequestLocale } from "@/i18n/server";
import { getMessages } from "@/i18n/messages";
import { createTranslator } from "@/i18n/translator";
import { getSparkxSessionFromHeaders } from "@/lib/sparkx-session";

export default async function ProjectsPage() {
  const locale = getRequestLocale();
  const t = createTranslator(getMessages(locale));
  const requestHeaders = await headers();
  const session = getSparkxSessionFromHeaders(requestHeaders);

  if (!session) {
    redirect("/login");
  }

  const userLabel = session.username ?? session.email ?? t("auth.signed_in");

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline-block">{t("workspace.home")}</span>
          </Link>
          <AuthControls label={userLabel} />
        </div>
      </header>
      <ProjectsHub />
    </main>
  );
}

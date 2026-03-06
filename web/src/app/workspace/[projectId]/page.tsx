import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getRequestLocale } from "@/i18n/server";
import { getMessages } from "@/i18n/messages";
import { createTranslator } from "@/i18n/translator";
import { getSparkxSessionFromHeaders } from "@/lib/sparkx-session";

export default async function WorkspacePage({
  params,
}: {
  params: { projectId: string };
}) {
  const { projectId } = params;
  const locale = getRequestLocale();
  const t = createTranslator(getMessages(locale));
  const requestHeaders = await headers();
  const session = getSparkxSessionFromHeaders(requestHeaders);

  if (!session) {
    redirect("/login");
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_SPARKX_API_BASE_URL || "http://localhost:8001";
  
  return (
    <main className="h-screen w-screen bg-slate-50">
      <div className="flex h-full flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-slate-900">
              {t("workspace.title")}
            </h1>
            <span className="text-sm text-slate-500">
              {t("workspace.project_id")}: {projectId}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              {session.username ?? session.email}
            </span>
          </div>
        </header>
        
        <div className="flex-1 overflow-hidden">
          <iframe
            src={`${apiBaseUrl}/ws?token=${session.accessToken}&project_id=${projectId}&user_id=${session.userId}`}
            className="h-full w-full border-0"
            title="Workspace"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </div>
    </main>
  );
}

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import Workspace from "@/components/Workspace/Workspace";
import { getRequestLocale } from "@/i18n/server";
import { getMessages } from "@/i18n/messages";
import { createTranslator } from "@/i18n/translator";
import { getSparkxSessionFromHeaders } from "@/lib/sparkx-session";

export default async function ProjectEditorPage({
  params,
  searchParams,
}: {
  params: { projectId: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const { projectId } = params;
  const locale = getRequestLocale();
  const t = createTranslator(getMessages(locale));
  const requestHeaders = await headers();
  const session = getSparkxSessionFromHeaders(requestHeaders);

  if (!session) {
    redirect("/login");
  }

  const userLabel = session.username ?? session.email ?? t("auth.signed_in");

  const panelParam = searchParams?.panel;
  const initialLeftPanel =
    panelParam === "project" || (Array.isArray(panelParam) && panelParam[0] === "project")
      ? "project"
      : "hierarchy";

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="h-screen">
        <Workspace 
          projectId={projectId}
          userId={session.userId}
          userLabel={userLabel}
          userToken={session.accessToken}
          initialLeftPanel={initialLeftPanel} 
          heightClassName="h-full" 
        />
      </div>
    </main>
  );
}

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import AuthControls from "@/components/Auth/AuthControls";
import ProjectIntro from "@/components/Projects/ProjectIntro";
import { getRequestLocale } from "@/i18n/server";
import { getMessages } from "@/i18n/messages";
import { createTranslator } from "@/i18n/translator";
import { getSparkxSessionFromHeaders } from "@/lib/sparkx-session";

export default async function ProjectIntroPage({
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

  const userLabel = session.username ?? session.email ?? t("auth.signed_in");

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-end px-6">
          <AuthControls label={userLabel} />
        </div>
      </header>
      <ProjectIntro projectId={projectId} />
    </main>
  );
}

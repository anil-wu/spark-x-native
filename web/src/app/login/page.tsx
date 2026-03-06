import { headers } from "next/headers";
import { redirect } from "next/navigation";

import LoginForm from "@/components/Auth/LoginForm";
import { getSparkxSessionFromHeaders } from "@/lib/sparkx-session";

type LoginPageProps = {
  searchParams?: {
    mode?: string | string[];
  };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const requestHeaders = await headers();
  const session = getSparkxSessionFromHeaders(requestHeaders);
  const modeParam = searchParams?.mode;
  const modeValue = Array.isArray(modeParam) ? modeParam[0] : modeParam;
  const initialMode = modeValue === "register" ? "register" : "login";
  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();

  if (session) {
    redirect("/projects");
  }

  return <LoginForm initialMode={initialMode} googleClientId={googleClientId} />;
}

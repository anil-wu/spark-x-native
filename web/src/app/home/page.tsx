import { headers } from "next/headers";
import { redirect } from "next/navigation";

import HomeDashboard from "@/components/Home/HomeDashboard";
import { getSparkxSessionFromHeaders } from "@/lib/sparkx-session";

export default async function UserHomePage() {
  const requestHeaders = await headers();
  const session = getSparkxSessionFromHeaders(requestHeaders);

  if (!session) {
    redirect("/login");
  }

  return (
    <HomeDashboard session={session} />
  );
}

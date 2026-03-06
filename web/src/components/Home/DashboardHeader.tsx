"use client";

import { LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";

import LanguageSwitcher from "@/components/I18n/LanguageSwitcher";
import { useI18n } from "@/i18n/client";
import { type SparkxSession } from "@/lib/sparkx-session";

interface DashboardHeaderProps {
  session: SparkxSession;
}

export default function DashboardHeader({ session }: DashboardHeaderProps) {
  const { t } = useI18n();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const userDisplayName = session.username || session.email.split("@")[0];

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await fetch("/api/sparkx/auth/logout", {
        method: "POST",
      });
    } catch {
      // Ignore error, always redirect to login
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <div className="mb-10 flex items-start justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {t("user_home.welcome", { name: userDisplayName })}
        </h1>
        <p className="mt-2 text-base text-slate-600">
          {t("user_home.subtitle")}
        </p>
        {session.isSuper ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
            <ShieldCheck size={16} />
            <span>{t("user_home.super_admin_notice")}</span>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white/90 px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
          title={t("auth.sign_out")}
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">
            {isSigningOut ? t("auth.signing_out") : t("auth.sign_out")}
          </span>
        </button>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import LanguageSwitcher from "@/components/I18n/LanguageSwitcher";
import { useI18n } from "@/i18n/client";

type AuthControlsProps = {
  label?: string;
  className?: string;
  compact?: boolean;
};

export default function AuthControls({
  label,
  className,
  compact = false,
}: AuthControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();
  const buttonClassName = compact
    ? "rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
    : "rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50";

  const handleGoHome = () => {
    router.push("/home");
  };

  const handleGoProjects = () => {
    router.push("/projects");
  };

  const handleSignOut = () => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/sparkx/auth/logout", {
          method: "POST",
        });

        if (!response.ok) {
          setError(t("auth.sign_out_failed"));
        }
      } catch {
        setError(t("auth.sign_out_failed"));
      } finally {
        window.location.href = "/login";
      }
    });
  };

  return (
    <div className={className ?? "flex items-center gap-2"}>
      {error && (
        <span className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-700">
          {error}
        </span>
      )}
      {!compact && label && (
        <span className="hidden rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 md:inline-block">
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={handleGoHome}
        className={buttonClassName}
      >
        {t("workspace.home")}
      </button>
      <LanguageSwitcher className={compact ? "inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50" : "inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"} />
      <button
        type="button"
        onClick={handleSignOut}
        disabled={pending}
        className={`${buttonClassName} disabled:cursor-not-allowed disabled:opacity-70`}
      >
        {pending ? t("auth.signing_out") : t("auth.sign_out")}
      </button>
    </div>
  );
}

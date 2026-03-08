"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useMemo, useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  UserPlus,
  Zap,
} from "lucide-react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";

import LanguageSwitcher from "@/components/I18n/LanguageSwitcher";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/i18n/client";
import styles from "./LoginForm.module.css";

type Mode = "login" | "register";
type PendingAction = "login" | "register" | null;
type Message = {
  type: "error" | "success" | "info";
  text: string;
};

type SparkxLoginResult = {
  userId: number;
  created: boolean;
  username?: string;
};

type Translator = ReturnType<typeof useI18n>["t"];
type PasswordStrength = {
  score: number;
  label: string;
};

type LoginFormState = {
  email: string;
  password: string;
  rememberMe: boolean;
};

type RegisterFormState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
};

type PasswordVisibilityState = {
  login: boolean;
  register: boolean;
  registerConfirm: boolean;
};

type LoginFormProps = {
  initialMode?: Mode;
  googleClientId?: string;
};

type FloatingInputProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  disabled: boolean;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  inputClassName?: string;
  rightSlot?: ReactNode;
  onValueChange: (value: string) => void;
};

type FloatingPasswordInputProps = Omit<FloatingInputProps, "type" | "rightSlot"> & {
  visible: boolean;
  onToggleVisible: () => void;
  showAriaLabel: string;
  hideAriaLabel: string;
  toggleClassName?: string;
};

const REDIRECT_AFTER_AUTH = "/home";

const INITIAL_LOGIN_FORM: LoginFormState = {
  email: "",
  password: "",
  rememberMe: false,
};

const INITIAL_REGISTER_FORM: RegisterFormState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  agreeTerms: false,
};

const PARTICLES = Array.from({ length: 36 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  delay: `${-(index * 0.4)}s`,
  duration: `${16 + (index % 5) * 2}s`,
  opacity: 0.15 + ((index % 7) * 0.05),
}));

function calculatePasswordStrength(value: string, t: Translator): PasswordStrength {
  if (!value) {
    return {
      score: 0,
      label: t("login.password_strength"),
    };
  }

  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^a-zA-Z\d]/.test(value)) score += 1;

  const labels = [
    t("login.password_strength"),
    t("login.password_strength_very_weak"),
    t("login.password_strength_weak"),
    t("login.password_strength_medium"),
    t("login.password_strength_strong"),
  ];

  return {
    score,
    label: score === 0 ? labels[1] : labels[score] ?? t("login.password_strength"),
  };
}

function getStrengthColor(score: number): string {
  if (score <= 1) return "bg-red-500";
  if (score === 2) return "bg-orange-500";
  if (score === 3) return "bg-yellow-500";
  return "bg-green-500";
}

function FloatingInput({
  id,
  name,
  label,
  value,
  disabled,
  required = true,
  type = "text",
  autoComplete,
  inputClassName,
  rightSlot,
  onValueChange,
}: FloatingInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-semibold text-orange-500">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          className={`h-14 rounded-2xl border border-[#dbe8ff] bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 focus-visible:border-[#c8d8f8] focus-visible:ring-2 focus-visible:ring-[#dbe8ff] disabled:bg-gray-100 ${inputClassName ?? ""}`}
        />
        {rightSlot}
      </div>
    </div>
  );
}

function FloatingPasswordInput({
  visible,
  onToggleVisible,
  showAriaLabel,
  hideAriaLabel,
  toggleClassName,
  inputClassName,
  ...props
}: FloatingPasswordInputProps) {
  return (
    <FloatingInput
      {...props}
      type={visible ? "text" : "password"}
      inputClassName={`pr-10 ${inputClassName ?? ""}`.trim()}
      rightSlot={
        <button
          type="button"
          onClick={onToggleVisible}
          className={
            toggleClassName ??
            "absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 transition-colors hover:text-gray-600"
          }
          aria-label={visible ? hideAriaLabel : showAriaLabel}
        >
          {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      }
    />
  );
}

function MessageBanner({ message }: { message: Message | null }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm transition-opacity ${
        message ? "opacity-100" : "pointer-events-none opacity-0"
      } ${
        message?.type === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : message?.type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
      role="alert"
      aria-live="polite"
      aria-hidden={!message}
    >
      {message?.text ?? "\u00A0"}
    </div>
  );
}

const parseApiErrorMessage = async (response: Response): Promise<string> => {
  const text = await response.text();
  if (!text) return "Request failed";
  try {
    const parsed = JSON.parse(text) as { message?: unknown; msg?: unknown };
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message;
    }
    if (typeof parsed.msg === "string" && parsed.msg.trim()) {
      return parsed.msg;
    }
  } catch {
    // ignore parse failure and return plain text
  }
  const normalized = text.trim();
  return normalized || "Request failed";
};

const loginWithSparkxApi = async (input: {
  email: string;
  password: string;
  username?: string;
}): Promise<{ ok: true; data: SparkxLoginResult } | { ok: false; message: string }> => {
  try {
    const response = await fetch("/api/sparkx/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      return {
        ok: false,
        message: await parseApiErrorMessage(response),
      };
    }

    return {
      ok: true,
      data: (await response.json()) as SparkxLoginResult,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Request failed",
    };
  }
};

const loginWithSparkxGoogle = async (
  idToken: string,
): Promise<{ ok: true; data: SparkxLoginResult } | { ok: false; message: string }> => {
  try {
    const response = await fetch("/api/sparkx/auth/login-google", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      return {
        ok: false,
        message: await parseApiErrorMessage(response),
      };
    }

    return {
      ok: true,
      data: (await response.json()) as SparkxLoginResult,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Request failed",
    };
  }
};

export default function LoginForm({ initialMode = "login", googleClientId }: LoginFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [message, setMessage] = useState<Message | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [pending, startTransition] = useTransition();

  const [loginForm, setLoginForm] = useState<LoginFormState>(() => ({
    ...INITIAL_LOGIN_FORM,
  }));
  const [registerForm, setRegisterForm] = useState<RegisterFormState>(() => ({
    ...INITIAL_REGISTER_FORM,
  }));
  const [passwordVisibility, setPasswordVisibility] = useState<PasswordVisibilityState>({
    login: false,
    register: false,
    registerConfirm: false,
  });

  const passwordStrength = useMemo(
    () => calculatePasswordStrength(registerForm.password, t),
    [registerForm.password, t],
  );
  const strengthColor = getStrengthColor(passwordStrength.score);

  const isLoginSubmitting = pending && pendingAction === "login";
  const isRegisterSubmitting = pending && pendingAction === "register";
  const googleLoginEnabled = Boolean(googleClientId?.trim());

  const setLoginEmail = (value: string) => {
    setLoginForm((prev) => ({ ...prev, email: value }));
    setMessage(null);
  };

  const setLoginPassword = (value: string) => {
    setLoginForm((prev) => ({ ...prev, password: value }));
    setMessage(null);
  };

  const setRegisterName = (value: string) => {
    setRegisterForm((prev) => ({ ...prev, name: value }));
    setMessage(null);
  };

  const setRegisterEmail = (value: string) => {
    setRegisterForm((prev) => ({ ...prev, email: value }));
    setMessage(null);
  };

  const setRegisterPassword = (value: string) => {
    setRegisterForm((prev) => ({ ...prev, password: value }));
    setMessage(null);
  };

  const setRegisterConfirmPassword = (value: string) => {
    setRegisterForm((prev) => ({ ...prev, confirmPassword: value }));
    setMessage(null);
  };

  const togglePasswordVisibility = (field: keyof PasswordVisibilityState) => {
    setPasswordVisibility((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleModeChange = (nextMode: Mode) => {
    setMode(nextMode);
    setMessage(null);
    setPendingAction(null);
  };

  const handleApple = () => {
    setMessage({
      type: "info",
      text: t("login.apple_coming_soon"),
    });
  };

  const handleGoogleSuccess = (credential?: string) => {
    if (!credential) {
      setMessage({
        type: "error",
        text: t("login.google_signin_failed"),
      });
      return;
    }

    setPendingAction("login");
    startTransition(() => {
      void (async () => {
        const sparkxResult = await loginWithSparkxGoogle(credential);
        if (!sparkxResult.ok) {
          setMessage({
            type: "error",
            text: sparkxResult.message || t("login.google_signin_failed"),
          });
          setPendingAction(null);
          return;
        }

        if (sparkxResult.data.created) {
          setMessage({
            type: "info",
            text: t("login.success_account_created"),
          });
        } else {
          setMessage({
            type: "success",
            text: t("login.success_login_redirect"),
          });
        }
        router.push(REDIRECT_AFTER_AUTH);
        router.refresh();
      })();
    });
  };

  const handleGoogleError = () => {
    setMessage({
      type: "error",
      text: t("login.google_signin_failed"),
    });
  };

  const handleGoogleUnavailable = () => {
    setMessage({
      type: "info",
      text: t("login.google_not_configured"),
    });
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const normalizedEmail = loginForm.email.trim();

    if (!normalizedEmail || !loginForm.password) {
      setMessage({
        type: "error",
        text: t("login.error_missing_email_password"),
      });
      return;
    }

    setPendingAction("login");
    startTransition(() => {
      void (async () => {
        const sparkxResult = await loginWithSparkxApi(
          {
            email: normalizedEmail,
            password: loginForm.password,
          },
        );
        if (!sparkxResult.ok) {
          setMessage({
            type: "error",
            text: sparkxResult.message || t("login.error_login_failed"),
          });
          setPendingAction(null);
          return;
        }

        if (sparkxResult.data.created) {
          setMessage({
            type: "info",
            text: t("login.success_account_created"),
          });
        } else {
          setMessage({
            type: "success",
            text: t("login.success_login_redirect"),
          });
        }
        router.push(REDIRECT_AFTER_AUTH);
        router.refresh();
      })();
    });
  };

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (registerForm.name.trim().length < 2) {
      setMessage({
        type: "error",
        text: t("login.error_username_too_short"),
      });
      return;
    }

    if (registerForm.password.length < 8) {
      setMessage({
        type: "error",
        text: t("login.error_password_too_short"),
      });
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setMessage({
        type: "error",
        text: t("login.error_password_mismatch"),
      });
      return;
    }

    if (!registerForm.agreeTerms) {
      setMessage({
        type: "error",
        text: t("login.error_terms_required"),
      });
      return;
    }

    setPendingAction("register");
    startTransition(() => {
      void (async () => {
        const normalizedRegisterEmail = registerForm.email.trim();

        const sparkxResult = await loginWithSparkxApi(
          {
            email: normalizedRegisterEmail,
            password: registerForm.password,
            username: registerForm.name.trim(),
          },
        );
        if (!sparkxResult.ok) {
          setMessage({
            type: "error",
            text: sparkxResult.message || t("login.error_register_failed"),
          });
          setPendingAction(null);
          return;
        }

        if (!sparkxResult.data.created) {
          setMessage({
            type: "error",
            text: t("login.error_register_failed"),
          });
          setPendingAction(null);
          return;
        }

        setLoginForm((prev) => ({
          ...prev,
          email: normalizedRegisterEmail,
          password: "",
        }));
        setRegisterForm({ ...INITIAL_REGISTER_FORM });
        setMode("login");
        window.history.replaceState(null, "", window.location.pathname);
        setMessage({
          type: "success",
          text: t("login.success_account_created"),
        });
        setPendingAction(null);
      })();
    });
  };

  return (
    <div
      className={`${styles.gradientBg} relative flex min-h-screen items-center justify-center p-4`}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {PARTICLES.map((particle) => (
          <span
            key={particle.id}
            className={styles.particle}
            style={{
              left: particle.left,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
              opacity: particle.opacity,
            }}
          />
        ))}
      </div>

      <div className="absolute right-4 top-4 z-50">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-[460px]">
        <div className="mb-8 flex items-center justify-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-yellow-400">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Spark<span className="text-orange-400">X</span>
          </span>
        </div>

        <div
          className={`${styles.glassCard} relative overflow-hidden rounded-3xl shadow-2xl`}
        >
          <div className="h-1 w-full bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400" />

          <div className="min-h-[400px] space-y-6 px-8 pb-9 pt-8">
            <form className="space-y-5" onSubmit={handleLogin}>
              <FloatingInput
                id="login-email"
                name="login-email"
                type="email"
                label={t("login.email")}
                value={loginForm.email}
                onValueChange={setLoginEmail}
                disabled={pending}
                autoComplete="email"
              />

              <FloatingPasswordInput
                id="login-password"
                name="login-password"
                label={t("login.password")}
                value={loginForm.password}
                onValueChange={setLoginPassword}
                disabled={pending}
                autoComplete="current-password"
                visible={passwordVisibility.login}
                onToggleVisible={() => togglePasswordVisibility("login")}
                showAriaLabel={t("login.show_password")}
                hideAriaLabel={t("login.hide_password")}
              />

              <div className="flex items-center justify-end text-sm">
                <button
                  type="button"
                  onClick={() =>
                    setMessage({
                      type: "info",
                      text: t("login.forgot_password_coming_soon"),
                    })
                  }
                  className="cursor-pointer text-base font-semibold text-orange-500 transition-colors hover:text-orange-600 sm:text-sm"
                >
                  {t("login.forgot_password")}
                </button>
              </div>

              <button
                type="submit"
                disabled={pending}
                className={`${styles.btnGradient} flex h-12 w-full cursor-pointer items-center justify-center space-x-2 rounded-xl px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70`}
              >
                {isLoginSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />
                    <span>{t("login.signing_in")}</span>
                  </>
                ) : message?.type === "success" ? (
                  <>
                    <Check className="h-5 w-5" />
                    <span>{t("login.signed_in")}</span>
                  </>
                ) : (
                  <>
                    <span>{t("login.sign_in")}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="min-h-[52px]">
              <MessageBanner message={message} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

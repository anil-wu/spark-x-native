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
          <Tabs
            value={mode}
            onValueChange={(nextMode) => handleModeChange(nextMode as Mode)}
            className="border-b border-[#edf2fa]"
          >
            <TabsList className="grid h-auto w-full grid-cols-2 rounded-none bg-transparent p-0">
              <TabsTrigger
                value="login"
                className="rounded-none border-b-2 border-transparent py-4 text-sm font-semibold text-slate-300 data-[state=active]:border-orange-400 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none"
              >
                {t("login.tab_login")}
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="rounded-none border-b-2 border-transparent py-4 text-sm font-semibold text-slate-300 data-[state=active]:border-orange-400 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none"
              >
                {t("login.tab_register")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="min-h-[650px] space-y-6 px-8 pb-9 pt-8">
            {mode === "login" ? (
              <form className="space-y-5" onSubmit={handleLogin}>
                <div className="mb-6 text-center">
                  <h2 className="mb-2 text-2xl font-semibold text-gray-900">
                    {t("login.welcome_back")}
                  </h2>
                  <p className="text-sm text-gray-500">{t("login.signin_subtitle")}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`${styles.socialBtn} relative flex h-10 items-center justify-center overflow-hidden rounded-xl bg-white text-sm font-semibold text-slate-700 ${
                      pending ? "pointer-events-none opacity-70" : ""
                    }`}
                  >
                    {googleLoginEnabled ? (
                      <>
                        <span className="flex items-center gap-2">
                          <svg className="h-4 w-4" viewBox="0 0 18 18" aria-hidden="true">
                            <path
                              fill="#EA4335"
                              d="M9 7.364v3.555h4.943c-.218 1.144-.87 2.113-1.853 2.764l2.994 2.324c1.746-1.607 2.752-3.974 2.752-6.79 0-.66-.06-1.296-.17-1.853H9z"
                            />
                            <path
                              fill="#34A853"
                              d="M9 18c2.484 0 4.568-.824 6.09-2.24l-2.994-2.324c-.824.553-1.877.883-3.096.883-2.378 0-4.39-1.605-5.107-3.766H.8v2.397A8.999 8.999 0 009 18z"
                            />
                            <path
                              fill="#4A90E2"
                              d="M3.893 10.553A5.41 5.41 0 013.607 9c0-.54.1-1.065.286-1.553V5.05H.8A8.999 8.999 0 000 9c0 1.454.348 2.83.8 3.95l3.093-2.397z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M9 3.58c1.35 0 2.56.465 3.515 1.378l2.635-2.635C13.566.84 11.482 0 9 0A8.999 8.999 0 00.8 5.05l3.093 2.397C4.61 5.186 6.622 3.58 9 3.58z"
                            />
                          </svg>
                          <span>Google</span>
                        </span>
                        <div className={styles.socialGoogleOverlay}>
                          <GoogleLogin
                            onSuccess={(credentialResponse: CredentialResponse) =>
                              handleGoogleSuccess(credentialResponse.credential)
                            }
                            onError={handleGoogleError}
                            theme="outline"
                            size="large"
                            shape="rectangular"
                            text="continue_with"
                            width={210}
                          />
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGoogleUnavailable}
                        className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-slate-700"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 18 18" aria-hidden="true">
                          <path
                            fill="#EA4335"
                            d="M9 7.364v3.555h4.943c-.218 1.144-.87 2.113-1.853 2.764l2.994 2.324c1.746-1.607 2.752-3.974 2.752-6.79 0-.66-.06-1.296-.17-1.853H9z"
                          />
                          <path
                            fill="#34A853"
                            d="M9 18c2.484 0 4.568-.824 6.09-2.24l-2.994-2.324c-.824.553-1.877.883-3.096.883-2.378 0-4.39-1.605-5.107-3.766H.8v2.397A8.999 8.999 0 009 18z"
                          />
                          <path
                            fill="#4A90E2"
                            d="M3.893 10.553A5.41 5.41 0 013.607 9c0-.54.1-1.065.286-1.553V5.05H.8A8.999 8.999 0 000 9c0 1.454.348 2.83.8 3.95l3.093-2.397z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M9 3.58c1.35 0 2.56.465 3.515 1.378l2.635-2.635C13.566.84 11.482 0 9 0A8.999 8.999 0 00.8 5.05l3.093 2.397C4.61 5.186 6.622 3.58 9 3.58z"
                          />
                        </svg>
                        <span>Google</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleApple}
                    disabled={pending}
                    className={`${styles.socialBtn} flex h-10 cursor-pointer items-center justify-center space-x-2 rounded-xl bg-white text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="black"
                      aria-hidden="true"
                    >
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zm-5.85-15.1c.07-2.04 1.76-3.89 3.75-4.12.29 2.32-2.07 4.46-3.75 4.12z" />
                    </svg>
                    <span>Apple</span>
                  </button>
                </div>

                <div className="relative flex items-center justify-center">
                  <div className="flex-1 border-t border-[#edf2fa]" />
                  <span className="bg-transparent px-3 text-xs text-[#a6b0c4]">
                    {t("login.or_email")}
                  </span>
                  <div className="flex-1 border-t border-[#edf2fa]" />
                </div>

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

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me"
                      checked={loginForm.rememberMe}
                      onCheckedChange={(checked) =>
                        setLoginForm((prev) => ({
                          ...prev,
                          rememberMe: checked === true,
                        }))
                      }
                      className="h-4 w-4 rounded border-[#dbe8ff] data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500"
                    />
                    <Label
                      htmlFor="remember-me"
                      className="cursor-pointer text-sm font-medium text-[#5f6d87] transition-colors hover:text-[#3e4a62]"
                    >
                      {t("login.remember_me")}
                    </Label>
                  </div>
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
            ) : (
              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="mb-6 text-center">
                  <h2 className="mb-2 text-2xl font-semibold text-gray-900">
                    {t("login.create_account_title")}
                  </h2>
                  <p className="text-sm text-gray-500">{t("login.create_account_subtitle")}</p>
                </div>

                <FloatingInput
                  id="reg-username"
                  name="reg-username"
                  label={t("login.username")}
                  value={registerForm.name}
                  onValueChange={setRegisterName}
                  disabled={pending}
                  autoComplete="name"
                />

                <FloatingInput
                  id="reg-email"
                  name="reg-email"
                  type="email"
                  label={t("login.email")}
                  value={registerForm.email}
                  onValueChange={setRegisterEmail}
                  disabled={pending}
                  autoComplete="email"
                />

                <FloatingPasswordInput
                  id="reg-password"
                  name="reg-password"
                  label={t("login.set_password")}
                  value={registerForm.password}
                  onValueChange={setRegisterPassword}
                  disabled={pending}
                  autoComplete="new-password"
                  visible={passwordVisibility.register}
                  onToggleVisible={() => togglePasswordVisibility("register")}
                  showAriaLabel={t("login.show_password")}
                  hideAriaLabel={t("login.hide_password")}
                />

                <div className="min-h-[34px]">
                  {registerForm.password.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex h-1 space-x-1">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div
                            key={index}
                            className={`flex-1 rounded-full transition-colors ${
                              index < passwordStrength.score ? strengthColor : "bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">
                        {t("login.password_strength_with_label", {
                          label: passwordStrength.label,
                        })}
                      </p>
                    </div>
                  )}
                </div>

                <FloatingPasswordInput
                  id="reg-confirm"
                  name="reg-confirm"
                  label={t("login.confirm_password")}
                  value={registerForm.confirmPassword}
                  onValueChange={setRegisterConfirmPassword}
                  disabled={pending}
                  autoComplete="new-password"
                  visible={passwordVisibility.registerConfirm}
                  onToggleVisible={() => togglePasswordVisibility("registerConfirm")}
                  showAriaLabel={t("login.show_password")}
                  hideAriaLabel={t("login.hide_password")}
                />

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="agree-terms"
                    checked={registerForm.agreeTerms}
                    onCheckedChange={(checked) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        agreeTerms: checked === true,
                      }))
                    }
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500"
                  />
                  <span className="text-xs leading-relaxed text-gray-500">
                    <Label htmlFor="agree-terms" className="cursor-pointer text-xs text-gray-500">
                      {t("login.terms_prefix")}
                    </Label>
                    <button
                      type="button"
                      className="ml-1 cursor-pointer text-orange-600 hover:underline"
                    >
                      {t("login.terms_of_use")}
                    </button>
                    {t("login.and")}
                    <button
                      type="button"
                      className="ml-1 cursor-pointer text-orange-600 hover:underline"
                    >
                      {t("login.privacy_policy")}
                    </button>
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={pending}
                  className={`${styles.btnGradient} flex w-full cursor-pointer items-center justify-center space-x-2 rounded-xl py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  {isRegisterSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />
                      <span>{t("login.creating")}</span>
                    </>
                  ) : (
                    <>
                      <span>{t("login.create_account")}</span>
                      <UserPlus className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="min-h-[52px]">
              <MessageBanner message={message} />
            </div>

            <div className="pt-10 text-center">
              <p className="text-sm font-medium text-[#b4bfd1]">
                {t("login.recaptcha_protected")}
                <br />
                <button
                  type="button"
                  className="cursor-pointer font-semibold text-[#a6b2c8] hover:text-[#7f8ea8]"
                >
                  {t("login.privacy_policy")}
                </button>
                {t("login.and")}
                <button
                  type="button"
                  className="cursor-pointer font-semibold text-[#a6b2c8] hover:text-[#7f8ea8]"
                >
                  {t("login.terms_of_service")}
                </button>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-sm text-[#a4b4cc] transition-colors hover:text-[#d1daea]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t("login.back_home")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

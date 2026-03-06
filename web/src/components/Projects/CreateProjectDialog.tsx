"use client";

import { useRef, useState } from "react";
import { Image as ImageIcon, UploadCloud, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/client";

const MAX_NAME_LENGTH = 50;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type CreateProjectDialogProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    name: string;
    coverImage?: string;
    coverFile?: File;
  }) => Promise<void> | void;
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Unable to read file"));
      }
    };
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });

export default function CreateProjectDialog({
  isOpen,
  isSubmitting,
  onCancel,
  onSubmit,
}: CreateProjectDialogProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState("");
  const [coverImage, setCoverImage] = useState<string | undefined>(undefined);
  const [coverFile, setCoverFile] = useState<File | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const resetForm = () => {
    setName("");
    setCoverImage(undefined);
    setCoverFile(undefined);
    setError(null);
    setIsDragOver(false);
  };

  const handleReadFile = async (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setError(t("projects.create_dialog.cover_invalid"));
      return;
    }

    try {
      const preview = await readFileAsDataUrl(file);
      setCoverImage(preview);
      setCoverFile(file);
      setError(null);
    } catch {
      setError(t("projects.create_dialog.cover_invalid"));
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    await handleReadFile(file);
    event.currentTarget.value = "";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError(t("projects.create_dialog.name_required"));
      return;
    }

    setError(null);
    await onSubmit({
      name: trimmedName,
      coverImage,
      coverFile,
    });
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onCancel();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[calc(100vh-4rem)] overflow-y-auto rounded-[32px] border border-slate-200/80 bg-slate-50 p-0 shadow-[0_32px_80px_-44px_rgba(15,23,42,0.55)] sm:max-w-4xl [&>button]:hidden"
        onEscapeKeyDown={(event) => {
          if (isSubmitting) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (isSubmitting) {
            event.preventDefault();
          }
        }}
      >
        <form
          className="space-y-8 px-5 py-8 sm:px-10 sm:py-10"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <DialogHeader className="space-y-3 text-center">
            <DialogTitle className="text-4xl font-black tracking-tight text-[#0f2b58] sm:text-5xl">
              {t("projects.create_dialog.title")}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 sm:text-base">
              {t("projects.create_dialog.subtitle")}
            </DialogDescription>
          </DialogHeader>

          <section className="space-y-3">
            <p className="text-sm font-semibold text-[#0f2b58]">
              {t("projects.create_dialog.cover_label")}
              <span className="ml-1 font-normal text-slate-400">
                {t("projects.create_dialog.cover_recommend_size")}
              </span>
            </p>

            <button
              type="button"
              onClick={() => {
                fileInputRef.current?.click();
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragOver(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragOver(false);
                const file = event.dataTransfer.files?.[0];
                if (!file) return;
                void handleReadFile(file);
              }}
              className={[
                "group relative flex h-[250px] w-full items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed transition",
                isDragOver
                  ? "border-sky-300 bg-sky-50/80"
                  : "border-slate-200 bg-slate-100/60 hover:border-slate-300",
              ].join(" ")}
            >
              {coverImage ? (
                <>
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    role="img"
                    aria-label={t("projects.create_dialog.cover_preview")}
                    style={{ backgroundImage: `url(${coverImage})` }}
                  />
                  <div className="absolute inset-0 bg-slate-900/35" />
                  <div className="relative z-10 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
                    {t("projects.create_dialog.cover_change")}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-200/80 text-slate-500">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-[#0f2b58]">
                      {t("projects.create_dialog.cover_upload_hint")}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {t("projects.create_dialog.cover_supported")}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                    <UploadCloud className="h-3.5 w-3.5" />
                    {t("projects.create_dialog.cover_click_upload")}
                  </div>
                </div>
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                void handleFileChange(event);
              }}
            />
          </section>

          <section className="space-y-3">
            <p className="text-sm font-semibold text-[#0f2b58]">
              {t("projects.create_dialog.name_label")}
              <span className="ml-1 text-red-500">*</span>
            </p>

            <Input
              value={name}
              onChange={(event) => {
                setName(event.currentTarget.value.slice(0, MAX_NAME_LENGTH));
                if (error) {
                  setError(null);
                }
              }}
              placeholder={t("projects.create_dialog.name_placeholder")}
              className="h-auto w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-xl text-[#0f2b58] outline-none transition placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-300/40"
            />

            <div className="text-sm text-slate-400">
              {name.length}/{MAX_NAME_LENGTH}
            </div>
          </section>

          {error && (
            <p
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="h-14 rounded-2xl border-slate-200 bg-white text-lg font-semibold text-[#0f2b58] transition hover:bg-slate-100"
              disabled={isSubmitting}
            >
              {t("projects.create_dialog.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-14 gap-2 rounded-2xl bg-[#0c1941] text-lg font-semibold text-white shadow-sm transition hover:bg-[#091637]"
            >
              <span>{isSubmitting ? t("projects.create_dialog.creating") : t("projects.create_dialog.create")}</span>
              <Zap className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

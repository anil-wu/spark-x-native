"use client";

import React from "react";
import { History, Pencil, Trash2, X } from "lucide-react";

export function HistoryModal({
  sessions,
  currentSessionId,
  isLoading,
  error,
  deletingSessionId,
  onRefresh,
  onLoadSession,
  onRenameSession,
  onDeleteSession,
  onClose,
  formatTime,
  t,
}: {
  sessions: Array<{ id: string; title: string; time?: { created: number; updated: number } }>;
  currentSessionId: string | null;
  isLoading: boolean;
  error: string | null;
  deletingSessionId: string | null;
  onRefresh: () => Promise<void> | void;
  onLoadSession: (sessionId: string) => Promise<void> | void;
  onRenameSession: (sessionId: string) => Promise<void> | void;
  onDeleteSession: (sessionId: string) => Promise<void> | void;
  onClose: () => void;
  formatTime: (timestamp: number | undefined) => string;
  t: (key: string) => string;
}) {
  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-[360px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <History size={16} className="text-blue-500" />
            {t("chat.history")}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" type="button">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">{isLoading ? t("chat.history_loading") : `${sessions.length}`}</div>
            <button onClick={onRefresh} className="text-xs text-blue-600 hover:text-blue-700 hover:underline" disabled={isLoading} type="button">
              {t("chat.history_refresh")}
            </button>
          </div>

          {error && <div className="text-xs p-2 rounded-lg bg-red-50 text-red-600 border border-red-100">{error}</div>}

          {!isLoading && sessions.length === 0 && !error && <div className="text-sm text-gray-500 py-8 text-center">{t("chat.history_empty")}</div>}

          <div className="max-h-[360px] overflow-auto space-y-2">
            {sessions.map(s => (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (deletingSessionId) return;
                  onLoadSession(s.id);
                }}
                onKeyDown={e => {
                  if (deletingSessionId) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onLoadSession(s.id);
                  }
                }}
                className={`w-full text-left p-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                  s.id === currentSessionId ? "border-blue-200 bg-blue-50" : "border-gray-100 hover:bg-gray-50"
                } ${deletingSessionId === s.id ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{s.title || s.id}</div>
                    <div className="text-[11px] text-gray-500 mt-1">{formatTime(s.time?.updated || s.time?.created)}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.id === currentSessionId && (
                      <div className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">{t("chat.history_current")}</div>
                    )}
                    <button
                      type="button"
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (deletingSessionId) return;
                        onRenameSession(s.id);
                      }}
                      disabled={!!deletingSessionId}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
                      title="重命名"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (deletingSessionId) return;
                        onDeleteSession(s.id);
                      }}
                      disabled={!!deletingSessionId}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
                      title={t("chat.history_delete")}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


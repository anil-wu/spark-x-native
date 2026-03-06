"use client";

import React from "react";
import { AlertCircle, Check, Settings, X } from "lucide-react";

export function SettingsModal({
  provider,
  setProvider,
  modelId,
  setModelId,
  apiKey,
  setApiKey,
  availableProviders,
  isSaving,
  feedback,
  onSave,
  onClose,
  t,
}: {
  provider: string;
  setProvider: (value: string) => void;
  modelId: string;
  setModelId: (value: string) => void;
  apiKey: string;
  setApiKey: (value: string) => void;
  availableProviders: any[];
  isSaving: boolean;
  feedback: { type: "success" | "error"; message: string } | null;
  onSave: () => Promise<void> | void;
  onClose: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-[320px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Settings size={16} className="text-blue-500" />
            {t("chat.settings")}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" type="button">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">{t("chat.model_provider")}</label>
            <select
              value={provider}
              onChange={e => {
                const newProvider = e.target.value;
                setProvider(newProvider);
                const pData = availableProviders.find(p => p.id === newProvider);
                if (pData && pData.models && Object.keys(pData.models).length > 0) {
                  setModelId(Object.keys(pData.models)[0]);
                }
              }}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
            >
              {availableProviders.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name || p.id}
                </option>
              ))}
              {availableProviders.length === 0 && <option value={provider}>{provider}</option>}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">{t("chat.model_id")}</label>
            <select
              value={modelId}
              onChange={e => setModelId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
            >
              {(() => {
                const pData = availableProviders.find(p => p.id === provider);
                if (pData && pData.models) {
                  return Object.keys(pData.models).map(mId => (
                    <option key={mId} value={mId}>
                      {mId}
                    </option>
                  ));
                }
                return <option value={modelId}>{modelId}</option>;
              })()}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">{t("chat.api_key")}</label>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={t("chat.api_key_placeholder")}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
              />
            </div>
          </div>

          {feedback && (
            <div className={`text-xs p-2 rounded-lg flex items-center gap-2 ${feedback.type === "success" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
              {feedback.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
              {feedback.message}
            </div>
          )}

          <button
            onClick={onSave}
            disabled={isSaving}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all flex items-center justify-center gap-2 ${
              isSaving ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600 active:scale-[0.98]"
            }`}
            type="button"
          >
            {isSaving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {t("chat.save_settings")}
          </button>
        </div>
      </div>
    </div>
  );
}


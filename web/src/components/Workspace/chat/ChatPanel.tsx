"use client";

import React, { useEffect, useState } from "react";
import { Bot, Sparkles, X } from "lucide-react";

import { useI18n } from "@/i18n/client";

import { ChatComposer } from "./ChatComposer";
import { ChatHeader } from "./ChatHeader";
import { ChatMessageList } from "./ChatMessageList";
import { HistoryModal } from "./HistoryModal";
import { TodoPanel } from "./TodoPanel";
import type { ChatPanelProps } from "./types";
import { useOpencodeChat } from "./useOpencodeChat";

export default function ChatPanel({ isCollapsed, togglePanel, projectId, userId, userToken }: ChatPanelProps) {
  const { locale, t } = useI18n();

  const [showHistory, setShowHistory] = useState(false);
  const [showAgents, setShowAgents] = useState(false);
  const [isTodoExpanded, setIsTodoExpanded] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const chat = useOpencodeChat({ locale, t, projectId, userId, userToken });

  useEffect(() => {
    setIsTodoExpanded(false);
  }, [chat.sessionId]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const seedText = inputValue;
    setInputValue("");
    await chat.sendPrompt(seedText);
  };

  if (isCollapsed) {
    return (
      <button
        onClick={togglePanel}
        className="absolute left-4 top-4 w-10 h-10 bg-white text-black rounded-lg flex items-center justify-center shadow-md hover:bg-gray-50 transition-all duration-200 z-50"
        type="button"
      >
        <Sparkles size={20} />
      </button>
    );
  }

  return (
    <div className="w-[400px] bg-white h-full flex flex-col rounded-3xl shadow-lg overflow-hidden border border-gray-100 transition-all duration-300">
      <ChatHeader
        title={t("workspace.title")}
        isOnline={chat.isOnline}
        onNewChat={chat.handleNewChat}
        onOpenHistory={() => {
          setShowHistory(true);
          void chat.fetchSessionHistory();
        }}
        onOpenAgents={() => {
          setShowAgents(true);
          void chat.fetchAgents();
        }}
        onTogglePanel={togglePanel}
        t={t}
      />

      <ChatMessageList
        messages={chat.messages}
        isLoading={chat.isLoading}
        error={chat.error}
        sessionId={chat.sessionId}
        onRetryInitSession={chat.initSession}
        emptyPlaceholder={t("chat.input_placeholder")}
        onReplyQuestion={chat.handleReplyQuestion}
        onRejectQuestion={chat.handleRejectQuestion}
      />

      <TodoPanel todos={chat.todos} isExpanded={isTodoExpanded} onToggle={() => setIsTodoExpanded(v => !v)} />

      <ChatComposer
        inputValue={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        isLoading={chat.isLoading}
        placeholder={t("chat.input_placeholder")}
        availableProviders={chat.availableProviders}
        modelLabel={`${chat.provider}/${chat.modelId}`}
        onOpenDropdown={() => {
          if (chat.availableProviders.length === 0) {
            void chat.fetchConfig();
          }
        }}
        onModelSelect={(provider, modelId) => {
          chat.setProvider(provider);
          chat.setModelId(modelId);
          void chat.handleSaveSettings(provider, modelId);
        }}
        agentMode={chat.agentMode}
        onAgentModeChange={mode => chat.setAgentMode(mode)}
      />

      {showHistory && (
        <HistoryModal
          sessions={chat.historySessions}
          currentSessionId={chat.sessionId}
          isLoading={chat.isHistoryLoading}
          error={chat.historyError}
          deletingSessionId={chat.deletingSessionId}
          onRefresh={chat.fetchSessionHistory}
          onLoadSession={async id => {
            const ok = await chat.loadHistorySession(id);
            if (ok) setShowHistory(false);
          }}
          onRenameSession={async id => {
            await chat.handleRenameSession(id);
          }}
          onDeleteSession={async id => {
            await chat.deleteHistorySession(id);
          }}
          onClose={() => setShowHistory(false)}
          formatTime={chat.formatHistoryTime}
          t={t}
        />
      )}

      {showAgents && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[360px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Bot size={16} className="text-blue-500" />
                {t("chat.agents")}
              </h3>
              <button onClick={() => setShowAgents(false)} className="text-gray-400 hover:text-gray-600 transition-colors" type="button">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">{chat.isAgentsLoading ? t("chat.agents_loading") : `${chat.agents.length}`}</div>
                <button
                  onClick={chat.fetchAgents}
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                  disabled={chat.isAgentsLoading}
                  type="button"
                >
                  {t("chat.agents_refresh")}
                </button>
              </div>

              {chat.agentsError && <div className="text-xs p-2 rounded-lg bg-red-50 text-red-600 border border-red-100">{chat.agentsError}</div>}

              {!chat.isAgentsLoading && chat.agents.length === 0 && !chat.agentsError && (
                <div className="text-sm text-gray-500 py-8 text-center">{t("chat.agents_empty")}</div>
              )}

              <div className="max-h-[360px] overflow-auto space-y-2">
                {chat.agents.map((a: any, idx: number) => {
                  const name = typeof a === "string" ? a : (a?.name ?? a?.id ?? a?.slug ?? `agent_${idx}`);
                  const desc = typeof a === "object" && a ? (a.description ?? a.prompt ?? "") : "";
                  return (
                    <div
                      key={typeof name === "string" ? name : idx}
                      className="w-full text-left p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-800 truncate">{String(name)}</div>
                      {desc ? <div className="text-[11px] text-gray-500 mt-1 line-clamp-3">{String(desc)}</div> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

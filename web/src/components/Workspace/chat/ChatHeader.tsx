"use client";

import React from "react";
import { Bot, Copy, History, Minimize2, PlusCircle, Share2 } from "lucide-react";

export function ChatHeader({
  title,
  isOnline,
  onNewChat,
  onOpenHistory,
  onOpenAgents,
  onTogglePanel,
  t,
}: {
  title: string;
  isOnline: boolean | null;
  onNewChat: () => void;
  onOpenHistory: () => void;
  onOpenAgents: () => void;
  onTogglePanel: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {isOnline !== null && (
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
              isOnline ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
            }`}
            title={isOnline ? "OpenCode Service Online" : "OpenCode Service Offline"}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            {isOnline ? "Online" : "Offline"}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 text-gray-600">
        <button onClick={onNewChat} className="hover:text-gray-900 transition-colors" title={t("chat.new_chat")}>
          <PlusCircle size={18} />
        </button>
        <button onClick={onOpenHistory} className="hover:text-gray-900 transition-colors" title={t("chat.history")}>
          <History size={18} />
        </button>
        <button onClick={onOpenAgents} className="hover:text-gray-900 transition-colors" title={t("chat.agents")} type="button">
          <Bot size={18} />
        </button>
        <button className="hover:text-gray-900" type="button">
          <Share2 size={18} />
        </button>
        <button className="hover:text-gray-900" type="button">
          <Copy size={18} />
        </button>
        <button onClick={onTogglePanel} className="hover:text-gray-900" type="button">
          <Minimize2 size={18} />
        </button>
      </div>
    </div>
  );
}

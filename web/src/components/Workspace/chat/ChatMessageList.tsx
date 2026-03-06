"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, ChevronLeft, Sparkles, Zap } from "lucide-react";

import type { ChatMessage, ToolPart } from "./types";
import { renderPart, ToolPartComponent } from "./parts";

export function ChatMessageList({
  messages,
  isLoading,
  error,
  sessionId,
  onRetryInitSession,
  emptyPlaceholder,
  onReplyQuestion,
  onRejectQuestion,
}: {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
  onRetryInitSession: () => void;
  emptyPlaceholder: string;
  onReplyQuestion: (requestID: string, answers: Array<Array<string>>) => Promise<void>;
  onRejectQuestion: (requestID: string) => Promise<void>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedToolResults, setExpandedToolResults] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, error]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide p-5 space-y-6">
      {messages.length === 0 && !error && !isLoading ? (
        <div className="text-center text-gray-400 mt-20">
          <Sparkles className="mx-auto mb-4 opacity-20" size={48} />
          <p className="text-sm">{emptyPlaceholder}</p>
        </div>
      ) : (
        <>
          {messages.map(msg => {
            const getMessageTypeFromParts = (): "thinking" | "tool_call" | "tool_result" | "error" | "message" => {
              if (!msg.parts || msg.parts.length === 0) return "message";
              if (msg.info?.error) return "error";

              const hasToolPart = msg.parts.some(p => p.type === "tool");
              if (hasToolPart) {
                const toolPart = msg.parts.find(p => p.type === "tool") as ToolPart | undefined;
                if (toolPart?.state?.status === "failed" || (toolPart as any)?.state?.status === "error") return "error";
                if (toolPart?.state?.status === "completed") return "tool_result";
                return "tool_call";
              }

              const hasReasoningPart = msg.parts.some(p => p.type === "reasoning");
              if (hasReasoningPart) return "thinking";

              return "message";
            };

            const messageType = getMessageTypeFromParts();
            const toolPart = msg.parts?.find(p => p.type === "tool") as ToolPart | undefined;
            const toolName = toolPart?.tool || "Unknown";
            const isToolResultExpanded = !!expandedToolResults[msg.id];

            const getMessageStyles = () => {
              if (msg.role === "user") return "bg-blue-500 text-white rounded-tr-none";

              switch (messageType) {
                case "thinking":
                  return "bg-purple-50 text-purple-800 rounded-tl-none border border-purple-100 italic";
                case "tool_call":
                  return "bg-amber-50 text-amber-800 rounded-tl-none border border-amber-100";
                case "tool_result":
                  return "bg-green-50 text-green-800 rounded-tl-none border border-green-100";
                case "error":
                  return "bg-red-50 text-red-800 rounded-tl-none border border-red-100";
                default:
                  return "bg-gray-50 text-gray-800 rounded-tl-none shadow-sm border border-gray-100";
              }
            };

            const getMessageIcon = () => {
              if (msg.role === "user") return null;

              switch (messageType) {
                case "thinking":
                  return <Sparkles size={14} className="text-purple-500 mr-2" />;
                case "tool_call":
                  return <Zap size={14} className="text-amber-500 mr-2" />;
                case "tool_result":
                  return <Check size={14} className="text-green-500 mr-2" />;
                case "error":
                  return <AlertCircle size={14} className="text-red-500 mr-2" />;
                default:
                  return null;
              }
            };

            const getMessageTypeLabel = () => {
              switch (messageType) {
                case "thinking":
                  return "思考中...";
                case "tool_call":
                  return "工具调用";
                case "tool_result":
                  return "工具结果";
                case "error":
                  return "错误";
                default:
                  return "";
              }
            };

            if (msg.role === "assistant" && messageType === "tool_result") {
              return (
                <div key={msg.id} className="flex flex-col items-start">
                  <div className="w-[300px]">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-green-50 text-green-800 border border-green-100">
                      <Check size={12} className="text-green-600 shrink-0" />
                      <span className="text-xs font-medium truncate">{toolName}</span>
                      <button
                        type="button"
                        className="ml-auto p-0.5 rounded-md hover:bg-green-100/70 transition-colors"
                        onClick={() => setExpandedToolResults(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                        aria-label={isToolResultExpanded ? "收起工具结果" : "展开工具结果"}
                      >
                        <ChevronLeft size={12} className={`transition-transform ${isToolResultExpanded ? "rotate-0" : "-rotate-90"}`} />
                      </button>
                    </div>

                    {isToolResultExpanded && (
                      <div className="mt-2 rounded-xl border border-gray-100 bg-white p-3">
                        <div className="space-y-3 text-sm text-gray-800 leading-relaxed">
                          {(msg.parts || []).map((part, idx) => {
                            if (part.type === "tool") {
                              return <ToolPartComponent key={idx} part={part as any} idx={idx} hideHeader defaultCollapsed={false} />;
                            }
                            return renderPart(part as any, idx, { onReplyQuestion, onRejectQuestion });
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1">{msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`rounded-2xl p-3 text-sm leading-relaxed ${getMessageStyles()} ${
                    msg.role === "assistant" ? "w-[300px]" : "max-w-[85%]"
                  }`}
                >
                  {msg.role === "assistant" && messageType !== "message" && (
                    <div className="flex items-center mb-2 text-xs font-medium opacity-80">
                      {getMessageIcon()}
                      <span>{getMessageTypeLabel()}</span>
                    </div>
                  )}

                  {msg.parts && msg.parts.length > 0 ? (
                    <div className="space-y-3">
                      {msg.parts.map((part, idx) => renderPart(part as any, idx, { onReplyQuestion, onRejectQuestion }))}
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 mt-1">{msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-gray-400 p-2">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150" />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-300" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded-xl flex flex-col gap-2">
              <p>{error}</p>
              {!sessionId && (
                <button onClick={onRetryInitSession} className="text-red-700 font-semibold hover:underline flex items-center gap-1" type="button">
                  <Zap size={12} /> 重试连接
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}


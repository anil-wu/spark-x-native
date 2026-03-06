"use client";

import React, { useEffect, useState } from "react";
import { Box, Check, ChevronLeft, Paperclip, Sparkles, Zap } from "lucide-react";

import type {
  Part,
  QuestionPart,
  QuestionPart as QuestionPartType,
  ReasoningPart,
  RenderPartHandlers,
  ToolPart,
} from "./types";

export function ReasoningPartComponent({
  part,
  idx,
}: {
  part: ReasoningPart;
  idx: number;
}) {
  const isCompleted = !!part.time?.end;
  const [isCollapsed, setIsCollapsed] = useState(isCompleted);

  useEffect(() => {
    if (isCompleted) setIsCollapsed(true);
  }, [isCompleted]);

  return (
    <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-100 text-xs text-purple-800">
      <div
        className="flex items-center gap-2 mb-2 font-medium text-purple-700 cursor-pointer select-none hover:bg-purple-100/50 rounded px-2 py-1 transition-colors"
        onClick={() => setIsCollapsed(v => !v)}
      >
        <Sparkles size={12} />
        <span>{isCompleted ? "思考" : "推理中..."}</span>
        <ChevronLeft size={12} className={`ml-auto transition-transform ${isCollapsed ? "-rotate-90" : "rotate-0"}`} />
      </div>
      {!isCollapsed && <div className="whitespace-pre-wrap opacity-80">{part.text}</div>}
    </div>
  );
}

export function ToolPartComponent({
  part,
  idx,
  hideHeader = false,
  defaultCollapsed = true,
}: {
  part: ToolPart;
  idx: number;
  hideHeader?: boolean;
  defaultCollapsed?: boolean;
}) {
  const state = part.state;
  const toolName = part.tool || "Unknown";
  const isCompleted = state?.status === "completed" || state?.status === "failed" || state?.status === "error";
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const effectiveCollapsed = hideHeader ? false : isCollapsed;

  return (
    <div key={idx} className={hideHeader ? "" : "p-3 bg-white/50 rounded-lg border border-amber-200"}>
      {!hideHeader && (
        <div
          className="flex items-center gap-2 mb-2 text-xs font-medium text-amber-700 cursor-pointer select-none hover:bg-amber-50 rounded px-2 py-1 transition-colors"
          onClick={() => setIsCollapsed(v => !v)}
        >
          <Zap size={12} />
          <span>工具：{toolName}</span>
          {isCompleted && (
            <ChevronLeft size={12} className={`ml-auto transition-transform ${isCollapsed ? "-rotate-90" : "rotate-0"}`} />
          )}
        </div>
      )}

      {!effectiveCollapsed && (
        <>
          {state?.status === "pending" && <div className="text-xs text-amber-600">等待执行...</div>}

          {(state?.status === "executing" || state?.status === "running") && (
            <div className="text-xs text-amber-600">正在执行{state.title ? `: ${state.title}` : "..."}</div>
          )}

          {state?.status === "completed" && (
            <div className="text-xs text-green-600">
              <div className="font-medium mb-1">执行完成</div>
              {state.title && <div className="text-gray-500 mb-1">{state.title}</div>}
              {state.output && (
                <pre className="mt-2 p-2 bg-gray-50 rounded text-[10px] overflow-auto max-h-32">
                  {typeof state.output === "string" ? state.output : JSON.stringify(state.output, null, 2)}
                </pre>
              )}
              {state.attachments && state.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {state.attachments.map((attachment, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] text-gray-500">
                      <Paperclip size={10} />
                      <span>{attachment.filename || "Attachment"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(state?.status === "failed" || state?.status === "error") && (
            <div className="text-xs text-red-600">
              <div className="font-medium mb-1">执行失败</div>
              <pre className="mt-1 p-2 bg-red-50 rounded text-[10px] overflow-auto max-h-32">
                {state.error || "Unknown error"}
              </pre>
            </div>
          )}
        </>
      )}

      {effectiveCollapsed && isCompleted && !hideHeader && (
        <div className="text-xs">
          {state?.status === "completed" && <span className="text-green-600">✓ 已完成</span>}
          {(state?.status === "failed" || state?.status === "error") && <span className="text-red-600">✗ 已失败</span>}
        </div>
      )}
    </div>
  );
}

export function QuestionPartComponent({
  part,
  idx,
  onReply,
  onReject,
}: {
  part: QuestionPartType;
  idx: number;
  onReply: (requestID: string, answers: Array<Array<string>>) => Promise<void>;
  onReject: (requestID: string) => Promise<void>;
}) {
  const questions = part.questions || [];
  const [selectedLabels, setSelectedLabels] = useState<Array<Array<string>>>(() => {
    const initial = part.state?.answers;
    if (initial && Array.isArray(initial) && initial.length === questions.length) return initial;
    return questions.map(() => []);
  });
  const [customText, setCustomText] = useState<Array<string>>(() => questions.map(() => ""));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const nextQuestions = part.questions || [];
    setSelectedLabels(prev => {
      if (prev.length === nextQuestions.length) return prev;
      return nextQuestions.map((_, i) => prev[i] || []);
    });
    setCustomText(prev => {
      if (prev.length === nextQuestions.length) return prev;
      return nextQuestions.map((_, i) => prev[i] || "");
    });
  }, [part.questions]);

  const status = part.state?.status || "pending";
  const isDone = status === "replied" || status === "rejected";

  const toggleOption = (questionIndex: number, label: string) => {
    setSelectedLabels(prev => {
      const next = [...prev];
      const current = new Set(next[questionIndex] || []);
      const multiple = !!questions[questionIndex]?.multiple;
      if (!multiple) {
        next[questionIndex] = [label];
        return next;
      }
      if (current.has(label)) current.delete(label);
      else current.add(label);
      next[questionIndex] = Array.from(current);
      return next;
    });
  };

  const buildAnswers = () =>
    questions.map((q, i) => {
      const base = selectedLabels[i] || [];
      const customAllowed = q.custom !== false;
      const custom = customAllowed ? (customText[i] || "").trim() : "";
      if (!custom) return base;
      if (base.includes(custom)) return base;
      return [...base, custom];
    });

  const submit = async () => {
    if (isSubmitting || isDone) return;
    setIsSubmitting(true);
    try {
      await onReply(part.requestID, buildAnswers());
    } finally {
      setIsSubmitting(false);
    }
  };

  const reject = async () => {
    if (isSubmitting || isDone) return;
    setIsSubmitting(true);
    try {
      await onReject(part.requestID);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div key={idx} className="p-3 bg-white/50 rounded-lg border border-gray-200">
      <div className="text-xs font-medium text-gray-700 mb-2">需要你的选择</div>
      <div className="space-y-4">
        {questions.map((q, qi) => (
          <div key={qi} className="space-y-2">
            {(q.header || q.question) && <div className="text-xs font-semibold text-gray-800">{q.header || q.question}</div>}
            {q.header && q.question && <div className="text-xs text-gray-600 whitespace-pre-wrap">{q.question}</div>}
            <div className="flex flex-wrap gap-2">
              {(q.options || []).map((opt, oi) => {
                const isSelected = (selectedLabels[qi] || []).includes(opt.label);
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={isSubmitting || isDone}
                    onClick={() => toggleOption(qi, opt.label)}
                    className={`px-2 py-1 rounded-full text-[11px] border transition-colors ${
                      isSelected ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    } ${isSubmitting || isDone ? "opacity-60 cursor-not-allowed" : ""}`}
                    title={opt.description || opt.label}
                  >
                    <span className="inline-flex items-center gap-1">{isSelected ? <Check size={12} /> : null}{opt.label}</span>
                  </button>
                );
              })}
            </div>
            {q.custom !== false && (
              <input
                value={customText[qi] || ""}
                disabled={isSubmitting || isDone}
                onChange={e => {
                  const v = e.target.value;
                  setCustomText(prev => {
                    const next = [...prev];
                    next[qi] = v;
                    return next;
                  });
                }}
                placeholder="自定义答案（可选）"
                className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={isSubmitting || isDone}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
            isDone ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed" : "bg-blue-500 border-blue-500 text-white hover:bg-blue-600"
          } ${isSubmitting ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          提交
        </button>
        <button
          type="button"
          onClick={reject}
          disabled={isSubmitting || isDone}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
            isDone ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
          } ${isSubmitting ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          跳过
        </button>
        {status === "replied" && <span className="text-[11px] text-green-600 ml-auto">已提交</span>}
        {status === "rejected" && <span className="text-[11px] text-gray-500 ml-auto">已跳过</span>}
      </div>
    </div>
  );
}

export function renderPart(part: Part, idx: number, handlers?: RenderPartHandlers) {
  if (part.type === "text") {
    return (
      <div key={idx} className="whitespace-pre-wrap">
        {part.text}
      </div>
    );
  }

  if (part.type === "tool") {
    return <ToolPartComponent key={idx} part={part} idx={idx} />;
  }

  if (part.type === "reasoning") {
    return <ReasoningPartComponent key={idx} part={part} idx={idx} />;
  }

  if (part.type === "file") {
    const fileUrl = part.url?.startsWith("http") ? part.url : `http://localhost:4096${part.url}`;

    if (part.mime?.startsWith("image/")) {
      return (
        <div key={idx} className="mt-2 rounded-lg overflow-hidden border border-gray-200 bg-white">
          <img
            src={fileUrl}
            alt={part.filename || "Generated Image"}
            className="w-full h-auto object-contain max-h-[300px]"
            loading="lazy"
          />
          {part.filename && (
            <div className="px-2 py-1 text-[10px] text-gray-400 bg-gray-50 border-t border-gray-100 truncate">{part.filename}</div>
          )}
        </div>
      );
    }

    return (
      <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 text-xs">
        <Paperclip size={14} className="text-gray-400" />
        <a href={fileUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline truncate">
          {part.filename || "Download File"}
        </a>
      </div>
    );
  }

  if (part.type === "output") {
    return (
      <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-center gap-2 mb-2 text-xs font-medium text-blue-700">
          <Box size={12} />
          <span>输出：{part.format}</span>
        </div>
        <pre className="text-xs text-blue-800 whitespace-pre-wrap overflow-auto max-h-64">{part.content}</pre>
      </div>
    );
  }

  if (part.type === "question") {
    if (!handlers) return null;
    return <QuestionPartComponent key={idx} part={part as QuestionPart} idx={idx} onReply={handlers.onReplyQuestion} onReject={handlers.onRejectQuestion} />;
  }

  return null;
}


"use client";

import React from "react";
import { ChevronLeft } from "lucide-react";

import type { TodoItem } from "./types";

export function TodoPanel({
  todos,
  isExpanded,
  onToggle,
}: {
  todos: TodoItem[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const activeTodos = todos.filter(t => t.status !== "cancelled");
  const todoTotal = activeTodos.length;
  if (todoTotal === 0) return null;

  const todoCompleted = activeTodos.filter(t => t.status === "completed").length;
  const todoProgress = todoTotal > 0 ? Math.round((todoCompleted / todoTotal) * 100) : 0;
  const currentTodo =
    activeTodos.find(t => t.status === "in_progress") || activeTodos.find(t => t.status === "pending") || undefined;

  return (
    <div className="px-4 pb-2">
      <div className="border border-gray-200 rounded-2xl p-3 shadow-sm bg-white">
        <div className="mb-0">
          <div
            className="flex items-center justify-between text-xs text-gray-600 cursor-pointer select-none hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
            onClick={onToggle}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">任务列表</span>
              <span className="text-gray-400">
                {todoCompleted}/{todoTotal}
              </span>
            </div>
            <ChevronLeft size={14} className={`transition-transform ${isExpanded ? "rotate-0" : "-rotate-90"}`} />
          </div>

          {!isExpanded ? (
            <div className="mt-1 px-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-gray-700 truncate">{currentTodo ? currentTodo.content : "暂无任务"}</div>
                <div className="text-[10px] text-gray-400 shrink-0">{todoProgress}%</div>
              </div>
              <div className="mt-1 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${todoProgress}%` }} />
              </div>
            </div>
          ) : (
            <div className="mt-2 px-2">
              <div className="flex items-center justify-between text-[10px] text-gray-400 mb-2">
                <span>进度</span>
                <span>
                  {todoCompleted}/{todoTotal} · {todoProgress}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${todoProgress}%` }} />
              </div>

              <div className="space-y-1 max-h-40 overflow-auto pr-1">
                {activeTodos.map((todo, idx) => {
                  const statusLabel =
                    todo.status === "completed"
                      ? "已完成"
                      : todo.status === "in_progress"
                        ? "进行中"
                        : todo.status === "cancelled"
                          ? "已取消"
                          : "待开始";
                  const statusClass =
                    todo.status === "completed"
                      ? "bg-green-50 text-green-700 border-green-100"
                      : todo.status === "in_progress"
                        ? "bg-blue-50 text-blue-700 border-blue-100"
                        : todo.status === "cancelled"
                          ? "bg-gray-50 text-gray-500 border-gray-100"
                          : "bg-amber-50 text-amber-700 border-amber-100";
                  const priorityDot =
                    todo.priority === "high" ? "bg-red-400" : todo.priority === "low" ? "bg-gray-300" : "bg-amber-400";

                  return (
                    <div key={`${todo.content}_${idx}`} className="flex items-start gap-2 rounded-lg border border-gray-100 bg-white px-2 py-1.5">
                      <span className={`mt-1 w-1.5 h-1.5 rounded-full ${priorityDot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-800 leading-snug whitespace-pre-wrap break-words">{todo.content}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusClass}`}>{statusLabel}</span>
                          <span className="text-[10px] text-gray-400">{todo.priority}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


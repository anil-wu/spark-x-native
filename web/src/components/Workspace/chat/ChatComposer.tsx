"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, AtSign, Box, Check, Paperclip, Plane, Wrench } from "lucide-react";

export function ChatComposer({
  inputValue,
  onChange,
  onSend,
  isLoading,
  placeholder,
  availableProviders,
  onModelSelect,
  onOpenDropdown,
  modelLabel,
  agentMode,
  onAgentModeChange,
}: {
  inputValue: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  placeholder: string;
  availableProviders?: any[];
  onModelSelect?: (provider: string, modelId: string) => void;
  onOpenDropdown?: () => void;
  modelLabel?: string;
  agentMode?: "plan" | "build";
  onAgentModeChange?: (mode: "plan" | "build") => void;
}) {
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleModelSelect = (provider: string, modelId: string) => {
    onModelSelect?.(provider, modelId);
    setShowModelDropdown(false);
  };

  const handleDropdownClick = () => {
    if (!showModelDropdown) {
      onOpenDropdown?.();
    }
    setShowModelDropdown(!showModelDropdown);
  };

  const effectiveAgentMode = agentMode || "build";

  return (
    <div className="p-4 bg-white border-t border-gray-100">
      <div className="border border-gray-200 rounded-2xl p-3 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 transition-shadow bg-white">
        <textarea
          value={inputValue}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={placeholder}
          className="w-full h-16 resize-none outline-none text-sm text-gray-700 placeholder-gray-400 bg-transparent"
        />

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-gray-400">
            <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors" type="button">
              <Paperclip size={16} />
            </button>
            <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors" type="button">
              <AtSign size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-50 rounded-full p-1 border border-gray-100">
              <button
                className={`p-1.5 rounded-full transition-all ${
                  effectiveAgentMode === "plan" ? "text-blue-600 bg-white shadow-sm" : "text-gray-400 hover:text-gray-600 hover:bg-white"
                }`}
                onClick={() => onAgentModeChange?.("plan")}
                type="button"
                title="Plan"
              >
                <Plane size={16} />
              </button>
              <button
                className={`p-1.5 rounded-full transition-all ${
                  effectiveAgentMode === "build" ? "text-blue-600 bg-white shadow-sm" : "text-gray-400 hover:text-gray-600 hover:bg-white"
                }`}
                onClick={() => onAgentModeChange?.("build")}
                type="button"
                title="Build"
              >
                <Wrench size={16} />
              </button>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={handleDropdownClick}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-all"
                  title={modelLabel ? `模型：${modelLabel}` : "模型"}
                  type="button"
                >
                  <Box size={16} />
                </button>
                {showModelDropdown && availableProviders && availableProviders.length > 0 && (
                  <div className="absolute bottom-full right-0 mb-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 max-h-80 overflow-y-auto">
                    {availableProviders.map(provider => (
                      <div key={provider.id}>
                        <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-600 border-b border-gray-100">
                          {provider.name || provider.id}
                        </div>
                        {provider.models &&
                          Object.keys(provider.models).map(modelId => (
                            <button
                              key={modelId}
                              onClick={() => handleModelSelect(provider.id, modelId)}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 flex items-center justify-between"
                              type="button"
                            >
                              <span>{modelId}</span>
                              {modelLabel === `${provider.id}/${modelId}` && <Check size={14} className="text-blue-500" />}
                            </button>
                          ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onSend}
              disabled={!inputValue.trim() || isLoading}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors ${
                !inputValue.trim() || isLoading ? "bg-gray-300" : "bg-blue-500 hover:bg-blue-600"
              }`}
              type="button"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

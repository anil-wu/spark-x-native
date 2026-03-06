"use client";

import React from "react";
import {
  Circle,
  Hand,
  Image as ImageIcon,
  MessageCircle,
  MousePointer2,
  PenTool,
  Pencil,
  Square,
  Star,
  Triangle,
  Type,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/client";
import { ToolType } from "../types/ToolType";
import { isDrawTool, isSelectTool, isShapeTool } from "../types/toolGroups";

interface ToolsPanelProps {
  isSidebarCollapsed: boolean;
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

type ToolMenuItem = {
  id: ToolType;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
};

const BlockArrowLeftIcon = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 10H10L10 6L4 12L10 18L10 14H20V10Z" />
  </svg>
);

const BlockArrowRightIcon = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 10H14L14 6L20 12L14 18L14 14H4V10Z" />
  </svg>
);

const baseButtonClass =
  "w-9 h-9 flex items-center justify-center rounded-md transition-colors";

const getButtonClass = (active: boolean): string =>
  `${baseButtonClass} ${active ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-100"}`;

export default function ToolsPanel({
  isSidebarCollapsed,
  activeTool,
  onToolChange,
}: ToolsPanelProps) {
  const { t } = useI18n();

  const selectTools: ToolMenuItem[] = [
    { id: "select", icon: <MousePointer2 size={20} />, label: t("tools.select"), shortcut: "V" },
    { id: "hand", icon: <Hand size={20} />, label: t("tools.hand_tool"), shortcut: "H" },
  ];

  const shapeTools: ToolMenuItem[] = [
    { id: "rectangle", icon: <Square size={20} />, label: "Rectangle", shortcut: "R" },
    { id: "circle", icon: <Circle size={20} />, label: "Circle", shortcut: "O" },
    { id: "triangle", icon: <Triangle size={20} />, label: "Triangle" },
    { id: "star", icon: <Star size={20} />, label: "Star" },
  ];

  const textShapeTools: ToolMenuItem[] = [
    { id: "rectangle-text", icon: <Square size={20} />, label: "Rectangle Text" },
    { id: "circle-text", icon: <Circle size={20} />, label: "Circle Text" },
    { id: "chat-bubble", icon: <MessageCircle size={20} />, label: "Chat Bubble" },
    { id: "arrow-left", icon: <BlockArrowLeftIcon size={20} />, label: "Arrow Left" },
    { id: "arrow-right", icon: <BlockArrowRightIcon size={20} />, label: "Arrow Right" },
  ];

  const penTools: ToolMenuItem[] = [
    { id: "pencil", icon: <Pencil size={20} />, label: t("tools.pencil"), shortcut: "Shift + P" },
    { id: "pen", icon: <PenTool size={20} />, label: t("tools.pen"), shortcut: "P" },
  ];

  const isShapeActive = isShapeTool(activeTool);
  const isPenActive = isDrawTool(activeTool);
  const isSelectActive = isSelectTool(activeTool);

  const activeSelectIcon =
    selectTools.find((tool) => tool.id === activeTool)?.icon ?? <MousePointer2 size={20} />;
  const activeShapeIcon =
    [...shapeTools, ...textShapeTools].find((tool) => tool.id === activeTool)?.icon ??
    <Square size={20} />;
  const activePenIcon =
    penTools.find((tool) => tool.id === activeTool)?.icon ?? <Pencil size={20} />;

  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 flex gap-2 transition-all duration-300 z-40 ${
        isSidebarCollapsed ? "left-4" : "left-10"
      }`}
    >
      <div className="bg-white rounded-lg p-2 shadow-lg flex flex-col gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={getButtonClass(isSelectActive)}
              onClick={() => {
                if (!isSelectActive) {
                  onToolChange("select");
                }
              }}
            >
              {activeSelectIcon}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" className="w-[220px]">
            {selectTools.map((tool) => (
              <DropdownMenuItem
                key={tool.id}
                className="flex items-center gap-3"
                onSelect={() => onToolChange(tool.id)}
              >
                {tool.icon}
                <span>{tool.label}</span>
                <DropdownMenuShortcut>{tool.shortcut}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={getButtonClass(isShapeActive)}
              onClick={() => {
                if (!isShapeActive) {
                  onToolChange("rectangle");
                }
              }}
            >
              {activeShapeIcon}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" className="w-[260px]">
            <DropdownMenuLabel>{t("tools.shape")}</DropdownMenuLabel>
            {shapeTools.map((tool) => (
              <DropdownMenuItem
                key={tool.id}
                className="flex items-center gap-3"
                onSelect={() => onToolChange(tool.id)}
              >
                {tool.icon}
                <span>{tool.label}</span>
                {tool.shortcut ? <DropdownMenuShortcut>{tool.shortcut}</DropdownMenuShortcut> : null}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("tools.shape_text")}</DropdownMenuLabel>
            {textShapeTools.map((tool) => (
              <DropdownMenuItem
                key={tool.id}
                className="flex items-center gap-3"
                onSelect={() => onToolChange(tool.id)}
              >
                {tool.icon}
                <span>{tool.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={() => onToolChange("text")}
          className={getButtonClass(activeTool === "text")}
        >
          <Type size={20} />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={getButtonClass(isPenActive)}
              onClick={() => {
                if (!isPenActive) {
                  onToolChange("pencil");
                }
              }}
            >
              {activePenIcon}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" className="w-[220px]">
            {penTools.map((tool) => (
              <DropdownMenuItem
                key={tool.id}
                className="flex items-center gap-3"
                onSelect={() => onToolChange(tool.id)}
              >
                {tool.icon}
                <span>{tool.label}</span>
                <DropdownMenuShortcut>{tool.shortcut}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={() => onToolChange("image")}
          className={getButtonClass(activeTool === "image")}
        >
          <ImageIcon size={20} />
        </button>
      </div>
    </div>
  );
}

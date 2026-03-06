"use client";

import React, { useState } from "react";
import HierarchyPanel from "./hierarchy/HierarchyPanel";
import ProjectPanel from "./project/ProjectPanel";
import GamePanel from "./game/GamePanel";
import CanvasArea from "./CanvasArea";
import ChatPanel from "./chat/ChatPanel";
import CodeArea from "./code/CodeArea";
import ProjectIntroPanel from "./project-intro/ProjectIntroPanel";
import WorkspaceHeader from "./WorkspaceHeader";
import { FolderOpen, Layers } from "lucide-react";
import { useI18n } from "@/i18n/client";

type WorkspaceProps = {
  projectId?: string;
  userId?: number;
  userLabel?: string;
  userToken?: string;
  initialLeftPanel?: 'hierarchy' | 'project';
  initialViewMode?: 'resource' | 'preview' | 'code' | 'intro';
  heightClassName?: string;
};

export default function Workspace({
  projectId,
  userId,
  userToken,
  initialLeftPanel = 'hierarchy',
  initialViewMode = 'resource',
  heightClassName = 'h-screen',
}: WorkspaceProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'resource' | 'preview' | 'code' | 'intro'>(initialViewMode);
  const [leftPanel, setLeftPanel] = useState<'hierarchy' | 'project'>(initialLeftPanel);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleRightPanel = () => {
    setIsRightPanelCollapsed(!isRightPanelCollapsed);
  };

  return (
    <div className={`flex flex-col ${heightClassName} w-full bg-gray-50`}>
      {/* 上边：WorkspaceHeader */}
      <div className="flex-shrink-0 p-4 bg-white border-b border-gray-200">
        <WorkspaceHeader 
          projectId={projectId} 
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      {/* 下边：左右布局 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左边：ChatPanel */}
        <div className={`transition-all duration-300 relative ${isRightPanelCollapsed ? 'w-0 p-0' : 'w-auto p-4 h-full'}`}>
          <ChatPanel
            isCollapsed={isRightPanelCollapsed}
            togglePanel={toggleRightPanel}
            projectId={projectId}
            userId={userId}
            userToken={userToken}
          />
        </div>

        {/* 右边：内容区域 */}
        <div className="flex flex-1 overflow-hidden relative">
          {viewMode === 'intro' ? (
            // 项目介绍模式
            <ProjectIntroPanel projectId={projectId} />
          ) : viewMode === 'resource' ? (
            // 资源模式：CanvasArea（已包含 HierarchyPanel）
            <CanvasArea 
              isSidebarCollapsed={isSidebarCollapsed}
              projectId={projectId}
            />
          ) : viewMode === 'code' ? (
            // Code 模式：显示 CodeArea 组件
            <CodeArea 
              isSidebarCollapsed={isSidebarCollapsed}
              toggleSidebar={toggleSidebar}
              projectId={projectId}
              userId={userId}
              userToken={userToken}
            />
          ) : (
            // 预览模式：只显示 GamePanel
            <GamePanel projectId={projectId} />
          )}
        </div>
      </div>
    </div>
  );
}

function LeftPanelSwitcher({
  leftPanel,
  onChange,
}: {
  leftPanel: "hierarchy" | "project";
  onChange: (panel: "hierarchy" | "project") => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex bg-gray-200/50 p-1 rounded-xl shrink-0">
      <button
        type="button"
        onClick={() => onChange("hierarchy")}
        className={`flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-medium transition-all ${
          leftPanel === "hierarchy"
            ? "bg-white shadow-sm text-gray-900"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <Layers size={14} className="mr-1.5" />
        {t("workspace.layers")}
      </button>
      <button
        type="button"
        onClick={() => onChange("project")}
        className={`flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-medium transition-all ${
          leftPanel === "project"
            ? "bg-white shadow-sm text-gray-900"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <FolderOpen size={14} className="mr-1.5" />
        {t("workspace.project")}
      </button>
    </div>
  );
}



"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Konva from 'konva';
import { useSearchParams } from 'next/navigation';
import ToolsPanel from './editor/ToolsPanel';
import ImageInspectorBar from './editor/tools/image/InspectorBar';
import ShapeInspectorBar from './editor/tools/shape/InspectorBar';
import DrawInspectorBar from './editor/tools/shared/DrawInspectorBar';
import DrawSelectionToolbar from './editor/tools/shared/DrawSelectionToolbar';
import TextInspectorBar from './editor/tools/text/InspectorBar';
import HierarchyPanel from './hierarchy/HierarchyPanel';
import { ZoomIn, ZoomOut, Trash2 } from 'lucide-react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { ContextMenu } from './editor/ContextMenu';
import HistoryControls from './editor/HistoryControls';
import { ElementState } from './types/ElementState';
import { ToolType } from './types/ToolType';
import { isDrawTool, isShapeTool, isTextLikeTool } from './types/toolGroups';
import { useWorkspaceSave } from '@/hooks/useWorkspaceSave';
import SaveButton from './SaveButton';
import ConflictDialog from './ConflictDialog';
import RecycleBinPanel from './RecycleBinPanel';
import { useI18n } from '@/i18n/client';
import { workspaceAPI, Layer } from '@/lib/workspace-api';
import { BaseElement, ShapeElement, TextElement, ImageElement, DrawElement, TextShapeElement } from './types/BaseElement';
import { MergeToolbar } from './editor/tools/shared/MergeToolbar';
import { calculateBoundingBox, mergeElements } from './editor/utils/mergeUtils';
import { getSelectedIds } from './editor/utils/selectionUtils';

// Dynamically import EditorStage to avoid SSR issues with Konva
const EditorStage = dynamic(() => import('./EditorStage'), { ssr: false });

interface CanvasAreaProps {
  isSidebarCollapsed: boolean;
  projectId?: string;
}

type DrawingStyle = { stroke: string; strokeWidth: number };
type ContextMenuState = { x: number; y: number; elementId: string | null };
type StagePosition = { x: number; y: number };
type CanvasDimensions = { width: number; height: number };

const TOOL_SHORTCUTS: Partial<Record<string, ToolType>> = {
  v: 'select',
  h: 'hand',
  r: 'rectangle',
  o: 'circle',
  t: 'text',
};

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
};

const getInspectorPosition = (
  element: BaseElement<any>,
  zoom: number,
  stagePos: StagePosition,
) => ({
  left: (element.x + element.width / 2) * zoom + stagePos.x,
  top: element.y * zoom + stagePos.y - 20,
});

// 将后端图层数据转换为前端元素
function createElementFromLayer(layer: Layer): BaseElement<any> | null {
  try {
    const baseState = {
      id: layer.id.toString(),
      name: layer.name,
      x: layer.positionX,
      y: layer.positionY,
      width: layer.width,
      height: layer.height,
      rotation: layer.rotation,
      visible: layer.visible,
      locked: layer.locked,
      isEditing: false,
    };

    switch (layer.layerType) {
      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'star':
        return new ShapeElement({
          ...baseState,
          type: layer.layerType as any,
          color: layer.properties?.color || '#3b82f6',
          stroke: layer.properties?.stroke || '#1d4ed8',
          strokeWidth: layer.properties?.strokeWidth || 2,
          strokeStyle: layer.properties?.strokeStyle || 'solid',
          cornerRadius: layer.properties?.cornerRadius || 0,
          sides: layer.properties?.sides,
          starInnerRadius: layer.properties?.starInnerRadius,
        });
      
      case 'text':
        return new TextElement({
          ...baseState,
          type: 'text',
          text: layer.properties?.text || 'Text',
          fontSize: layer.properties?.fontSize || 24,
          textColor: layer.properties?.textColor || '#000000',
          textStroke: layer.properties?.textStroke || '#000000',
          textStrokeWidth: layer.properties?.textStrokeWidth || 2,
          fontFamily: layer.properties?.fontFamily || 'Arial',
          fontStyle: layer.properties?.fontStyle || 'normal',
          align: layer.properties?.align || 'left',
          lineHeight: layer.properties?.lineHeight || 1.2,
          letterSpacing: layer.properties?.letterSpacing || 0,
          textDecoration: layer.properties?.textDecoration || 'none',
          textTransform: layer.properties?.textTransform || 'none',
        });
      
      case 'image':
        return new ImageElement({
          ...baseState,
          type: 'image',
          src: layer.properties?.src || '',
        });
      
      case 'pen':
      case 'pencil':
        return new DrawElement({
          ...baseState,
          type: layer.layerType as any,
          width: 0,
          height: 0,
          points: layer.properties?.points || [],
          stroke: layer.properties?.stroke || '#000000',
          strokeWidth: layer.properties?.strokeWidth || 2,
          fill: layer.properties?.fill || 'transparent',
        });
      
      case 'chat-bubble':
      case 'arrow-left':
      case 'arrow-right':
      case 'rectangle-text':
      case 'circle-text':
        return new TextShapeElement({
          ...baseState,
          type: layer.layerType as any,
          color: layer.properties?.color || '#8b5cf6',
          stroke: layer.properties?.stroke || '#6d28d9',
          strokeWidth: layer.properties?.strokeWidth || 2,
          strokeStyle: layer.properties?.strokeStyle || 'solid',
          cornerRadius: layer.properties?.cornerRadius || 0,
          text: layer.properties?.text || 'Label',
          textColor: layer.properties?.textColor || '#ffffff',
          fontSize: layer.properties?.fontSize || 14,
          textStroke: layer.properties?.textStroke || '#000000',
          textStrokeWidth: layer.properties?.textStrokeWidth || 2,
          fontFamily: layer.properties?.fontFamily || 'Arial',
          fontStyle: layer.properties?.fontStyle || 'normal',
          align: layer.properties?.align || 'center',
          lineHeight: layer.properties?.lineHeight || 1.2,
          letterSpacing: layer.properties?.letterSpacing || 0,
          textDecoration: layer.properties?.textDecoration || 'none',
          textTransform: layer.properties?.textTransform || 'none',
        });
      
      default:
        console.warn('Unknown layer type:', layer.layerType);
        return null;
    }
  } catch (error) {
    console.error('Failed to create element from layer:', layer, error);
    return null;
  }
}

export default function CanvasArea({
  isSidebarCollapsed,
  projectId,
}: CanvasAreaProps) {
  const searchParams = useSearchParams();
  const finalProjectId = projectId || searchParams?.get('projectId') || '';
  const { t } = useI18n();
  
  const { elements, selectedId, selectedIds, updateElement, activeTool, setActiveTool, removeElement, mergeSelectedElements } = useWorkspaceStore();
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<CanvasDimensions>({ width: 0, height: 0 });
  const [stagePos, setStagePos] = useState<StagePosition>({ x: 0, y: 0 });
  const [drawingStyle, setDrawingStyle] = useState<DrawingStyle>({ stroke: '#000000', strokeWidth: 2 });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [stageInstance, setStageInstance] = useState<Konva.Stage | null>(null);
  const [isHierarchyCollapsed, setIsHierarchyCollapsed] = useState(false);
  
  // 合并工具栏状态
  const [showMergeToolbar, setShowMergeToolbar] = useState(false);
  const [mergeToolbarPos, setMergeToolbarPos] = useState({ x: 0, y: 0 });
  
  const {
    saveStatus,
    lastSavedAt,
    errorMessage,
    handleSave,
  } = useWorkspaceSave(finalProjectId ? parseInt(finalProjectId) : 0);
  
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [canvasId, setCanvasId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const selectedElement = useMemo(() => {
    if (selectedId) {
      return elements.find((element) => element.id === selectedId) ?? null;
    }
    return null;
  }, [elements, selectedId]);

  // 监听选择变化，显示/隐藏合并工具栏
  useEffect(() => {
    const selectedCount = selectedIds.length;
    
    // 更新选择包围盒
    const { updateSelectionBoundingBox } = useWorkspaceStore.getState();
    updateSelectionBoundingBox();
    
    if (selectedCount >= 2 && stageInstance) {
      // 计算所有选中元素的中心位置
      const selectionIds = getSelectedIds(selectedId, selectedIds);
      const selectedElements = elements.filter(el => selectionIds.includes(el.id));
      
      if (selectedElements.length >= 2) {
        const boundingBox = calculateBoundingBox(selectedElements);
        const centerX = boundingBox.x + boundingBox.width / 2;
        const topY = boundingBox.y;
        
        // 转换为屏幕坐标
        const stagePos = stageInstance.position();
        const scale = stageInstance.scaleX();
        
        setMergeToolbarPos({
          x: centerX * scale + stagePos.x,
          y: topY * scale + stagePos.y,
        });
        setShowMergeToolbar(true);
      }
    } else {
      setShowMergeToolbar(false);
    }
  }, [selectedIds, selectedId, elements, stageInstance]);
  
  // 处理合并
  const handleMerge = async () => {
    if (!finalProjectId) {
      console.error('Project ID is required');
      return;
    }
    
    try {
      await mergeSelectedElements(parseInt(finalProjectId), stageInstance || undefined);
      setShowMergeToolbar(false);
    } catch (error) {
      console.error('合并失败:', error);
      alert(t('workspace.merge_failed'));
    }
  };
  
  // 处理下载选中的多个元素
  const handleDownloadSelected = async () => {
    if (selectedIds.length < 2) {
      return;
    }
    
    try {
      const result = await mergeElements(elements, selectedIds, stageInstance || undefined);
      if (result && result.thumbnailSrc) {
        const link = document.createElement('a');
        link.download = `merged_${Date.now()}.png`;
        link.href = result.thumbnailSrc;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('下载合并预览失败:', error);
      alert(t('workspace.download_failed'));
    }
  };

  // 加载画布数据
  useEffect(() => {
    const loadCanvas = async () => {
      if (!finalProjectId) {
        setIsLoading(false);
        return;
      }

      try {
        const projectId = parseInt(finalProjectId);
        const canvasData = await workspaceAPI.getCanvas(projectId);
        
        if (canvasData && canvasData.canvas) {
          setCanvasId(canvasData.canvas.id);
          
          // 将后端图层数据转换为前端元素
          const loadedElements: BaseElement<any>[] = [];
          
          const sortedLayers = [...canvasData.layers].sort((a, b) => a.zIndex - b.zIndex);

          for (const layer of sortedLayers) {
            const element = createElementFromLayer(layer);
            if (element) {
              loadedElements.push(element);
            }
          }
          
          // 批量添加到 store（会替换之前的元素）
          const { setElements } = useWorkspaceStore.getState();
          setElements(loadedElements);
          
          console.log(`Canvas loaded for project ${projectId}:`, loadedElements.length, 'elements');
        } else {
          // 如果没有画布数据，清空 store
          const { setElements } = useWorkspaceStore.getState();
          setElements([]);
          console.log('No canvas data found, cleared elements');
        }
      } catch (error) {
        console.error('Failed to load canvas:', error);
        // 出错时也清空 store
        const { setElements } = useWorkspaceStore.getState();
        setElements([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadCanvas();
  }, [finalProjectId]);

  const triggerDownload = useCallback((filename: string, href: string) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = href;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleDownload = useCallback(() => {
    if (!selectedId) {
      console.error('Download failed: No selected element');
      return;
    }

    if (!stageInstance) {
      console.error('Download failed: Stage not ready');
      return;
    }

    try {
      const node = stageInstance.findOne('#' + selectedId);
      if (!node) {
        console.error('Download failed: Selected node not found');
        return;
      }

      const dataURL = node.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });
      triggerDownload(`element-${selectedId}.png`, dataURL);
    } catch (error) {
      console.error('Error during download:', error);
    }
  }, [selectedId, stageInstance, triggerDownload]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isTypingTarget(e.target)) {
      return;
    }

    const isMod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (isMod && key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        useWorkspaceStore.temporal.getState().redo();
      } else {
        useWorkspaceStore.temporal.getState().undo();
      }
      return;
    }

    if (isMod && key === 'y') {
      e.preventDefault();
      useWorkspaceStore.temporal.getState().redo();
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      const { selectedId, selectedIds, removeElement } = useWorkspaceStore.getState();
      const selectionIds = getSelectedIds(selectedId, selectedIds);
      for (const id of selectionIds) {
        removeElement(id);
      }
      return;
    }

    if (key === 'p') {
      setActiveTool(e.shiftKey ? 'pencil' : 'pen');
      return;
    }

    const nextTool = TOOL_SHORTCUTS[key];
    if (nextTool) {
      setActiveTool(nextTool);
    }
  }, [setActiveTool]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleZoomIn = () => setZoom((value) => Math.min(value * 1.1, 3));
  const handleZoomOut = () => setZoom((value) => Math.max(value / 1.1, 0.1));

  const renderDrawInspector = () => {
    if (!isDrawTool(activeTool)) {
      return null;
    }

    const isMatchingElement = Boolean(selectedElement && selectedElement.type === activeTool);
    const element = isMatchingElement ? selectedElement : drawingStyle;

    const handleUpdate = (updates: Partial<ElementState>) => {
      setDrawingStyle((previous) => ({ ...previous, ...updates }));
      if (isMatchingElement && selectedId) {
        updateElement(selectedId, updates);
      }
    };

    return (
      <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2">
        <DrawInspectorBar
          element={element as any}
          onUpdate={handleUpdate}
          onDownload={isMatchingElement ? handleDownload : undefined}
        />
      </div>
    );
  };

  const renderSelectedInspector = () => {
    if (selectedIds.length > 0) {
      return null;
    }

    if (!selectedElement) {
      return null;
    }
    if (!selectedId) {
      return null;
    }

    const isImage = selectedElement.type === 'image';
    const isDraw = isDrawTool(selectedElement.type);
    const isShape = isShapeTool(selectedElement.type);
    const isText = selectedElement.type === 'text';

    // Drawing tools use the fixed top bar while active.
    if (isDraw && isDrawTool(activeTool)) {
      return null;
    }

    if (!isImage && !isShape && !isDraw && !isText) {
      return null;
    }

    const { left, top } = getInspectorPosition(selectedElement, zoom, stagePos);
    const handleUpdate = (updates: Partial<ElementState>) => {
      updateElement(selectedId, updates);
    };

    const shouldUseTextInspector = isText || (selectedElement.isEditing && isTextLikeTool(selectedElement.type));

    let inspector: React.ReactNode;
    if (shouldUseTextInspector) {
      inspector = (
        <TextInspectorBar
          element={selectedElement}
          onUpdate={handleUpdate}
          onDownload={handleDownload}
        />
      );
    } else if (isImage) {
      inspector = <ImageInspectorBar />;
    } else if (isDraw) {
      inspector = (
        <DrawSelectionToolbar
          element={selectedElement}
          onUpdate={handleUpdate}
          onDownload={handleDownload}
        />
      );
    } else {
      inspector = (
        <ShapeInspectorBar
          element={selectedElement}
          onUpdate={handleUpdate}
          onDownload={handleDownload}
        />
      );
    }

    return (
      <div
        className="absolute z-50 pointer-events-none transition-all duration-75 ease-out"
        style={{
          left,
          top,
          transform: 'translate(-50%, -100%)',
        }}
      >
        <div className="pointer-events-auto">{inspector}</div>
      </div>
    );
  };

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* 左侧画布区域 */}
      <div className="absolute top-0 right-4 h-full z-40 flex flex-row-reverse items-start gap-2 pointer-events-none">
        {/* 右侧 HierarchyPanel - 位于 EditorStage 上面 */}
        <div className={`h-full transition-all duration-300 ease-in-out pointer-events-auto ${isHierarchyCollapsed ? 'w-10 pt-4' : 'w-[260px]'}`}>
          <HierarchyPanel
            isCollapsed={isHierarchyCollapsed}
            toggleSidebar={() => setIsHierarchyCollapsed(!isHierarchyCollapsed)}
            projectId={finalProjectId}
          />
        </div>

        {/* 顶部操作按钮 - 放置于图层面板左侧 */}
        <div className="pt-4 flex items-start gap-2 pointer-events-auto">
          <SaveButton
            saveStatus={saveStatus}
            lastSavedAt={lastSavedAt}
            onSave={handleSave}
            errorMessage={errorMessage}
          />
          <button
            onClick={() => setShowRecycleBin(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            title={t('workspace.recycle_bin')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className="flex-1 relative bg-[#fafafa] overflow-hidden"
        ref={containerRef}
      >
        {/* 合并工具栏 */}
        {showMergeToolbar && (
          <MergeToolbar
            x={mergeToolbarPos.x}
            y={mergeToolbarPos.y}
            onMerge={handleMerge}
            onDownload={handleDownloadSelected}
            selectedCount={selectedIds.length}
            disabled={false}
          />
        )}

        <ToolsPanel
          isSidebarCollapsed={isSidebarCollapsed}
          activeTool={activeTool}
          onToolChange={setActiveTool}
        />

        {/* Canvas Stage Layer */}
        {dimensions.width > 0 && dimensions.height > 0 && (
          <EditorStage
            onStageReady={setStageInstance}
            activeTool={activeTool}
            onToolUsed={() => {}}
            onToolChange={setActiveTool}
            zoom={zoom}
            stagePos={stagePos}
            onStagePosChange={setStagePos}
            width={dimensions.width}
            height={dimensions.height}
            drawingStyle={drawingStyle}
            onContextMenu={(e, elementId) => {
              e.evt.preventDefault();
              const { selectedId, selectedIds, selectionBoundingBox, selectElement, updateSelectionBoundingBox } = useWorkspaceStore.getState();
              const selectionIds = getSelectedIds(selectedId, selectedIds);

              const stage = (e as any).target?.getStage?.();
              const pointerPos = stage?.getPointerPosition?.();
              const stagePos = stage?.position?.();
              const scale = stage?.scaleX?.();
              const canvasPos = pointerPos && stagePos && typeof scale === 'number'
                ? { x: (pointerPos.x - stagePos.x) / scale, y: (pointerPos.y - stagePos.y) / scale }
                : null;

              const isInsideSelectionBox = Boolean(
                selectionBoundingBox &&
                  canvasPos &&
                  canvasPos.x >= selectionBoundingBox.x &&
                  canvasPos.x <= selectionBoundingBox.x + selectionBoundingBox.width &&
                  canvasPos.y >= selectionBoundingBox.y &&
                  canvasPos.y <= selectionBoundingBox.y + selectionBoundingBox.height
              );

              if (elementId) {
                if (selectionIds.length === 0) {
                  selectElement(elementId);
                  updateSelectionBoundingBox();
                } else if (!selectionIds.includes(elementId)) {
                  selectElement(elementId);
                  updateSelectionBoundingBox();
                }
              } else if (selectionIds.length > 0 && isInsideSelectionBox) {
                updateSelectionBoundingBox();
              }

              setContextMenu({
                x: e.evt.clientX,
                y: e.evt.clientY,
                elementId: elementId || null,
              });
            }}
          />
        )}

        {/* Context Menu */}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            elementId={contextMenu.elementId}
            onClose={() => setContextMenu(null)}
            onMergeSelected={handleMerge}
          />
        )}

        {/* Persistent InspectorBar when in pencil/pen mode */}
        {renderDrawInspector()}

        {renderSelectedInspector()}

        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white rounded-lg px-2 py-1.5 shadow-md flex items-center gap-3 text-sm text-gray-700 z-50">
          <button className="p-1 hover:text-black transition-colors" onClick={handleZoomOut}><ZoomOut size={16} /></button>
          <span className="min-w-[40px] text-center font-medium">{Math.round(zoom * 100)}%</span>
          <button className="p-1 hover:text-black transition-colors" onClick={handleZoomIn}><ZoomIn size={16} /></button>
        </div>

        {/* History Controls */}
        <HistoryControls />
      </div>

      {/* Conflict Dialog */}
      <ConflictDialog
        isOpen={showConflictDialog}
        onClose={() => setShowConflictDialog(false)}
        onUseRemote={() => {
          // TODO: Implement remote version loading
          setShowConflictDialog(false);
        }}
        onForceSave={() => {
          handleSave();
          setShowConflictDialog(false);
        }}
      />

      {/* Recycle Bin Panel */}
      <RecycleBinPanel
        canvasId={canvasId}
        isOpen={showRecycleBin}
        onClose={() => setShowRecycleBin(false)}
        onRestore={(layerId) => {
          console.log('Layer restored:', layerId);
          // TODO: Reload layers from backend
        }}
      />
    </div>
  );
}

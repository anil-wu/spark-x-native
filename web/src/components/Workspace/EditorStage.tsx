"use client";

import React, { useRef, useEffect, useState, forwardRef } from 'react';
import { Stage, Layer, Transformer, Circle, Line } from 'react-konva';
import { ToolType } from './types/ToolType';
import Konva from 'konva';
import { 
  BaseElement as BaseElementModel, 
  DrawElement as DrawElementModel
} from './types/BaseElement';
import { Guideline } from './types/Guideline';

import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { ToolFactory } from './editor/tools/ToolFactory';
import { IMouseAction, ToolContext } from './editor/interfaces/IMouseAction';
import { getElementComponent } from './editor/tools/ElementRegistry';
import { getSnapShift } from './editor/utils/snapUtils';
import { getSelectedIds } from './editor/utils/selectionUtils';
import { Rect } from 'react-konva';


interface EditorStageProps {
  activeTool: ToolType;
  onToolUsed: () => void;
  zoom: number;
  stagePos?: { x: number, y: number };
  onStagePosChange?: (pos: { x: number, y: number }) => void;
  width: number;
  height: number;
  onToolChange?: (tool: ToolType) => void;
  drawingStyle?: { stroke: string; strokeWidth: number };
  onContextMenu?: (e: Konva.KonvaEventObject<PointerEvent>, elementId?: string) => void;
  onStageReady?: (stage: Konva.Stage | null) => void;
}

const EditorStage = forwardRef<Konva.Stage, EditorStageProps>(({
  activeTool,
  onToolUsed,
  zoom,
  stagePos = { x: 0, y: 0 },
  onStagePosChange,
  width,
  height,
  onToolChange,
  drawingStyle,
  onContextMenu,
  onStageReady,
}, ref) => {
  const { elements, selectedId, selectedIds, isSelecting, selectionBox, isDraggingSelection, shouldSuppressContextMenu, selectionBoundingBox, guidelines, setGuidelines } = useWorkspaceStore();
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [previewElement, setPreviewElement] = useState<BaseElementModel<any> | null>(null);
  const [isClosingPath, setIsClosingPath] = useState(false);

  // Tool Instance Management
  const toolInstanceRef = useRef<IMouseAction | null>(null);

  useEffect(() => {
    toolInstanceRef.current = ToolFactory.createTool(activeTool);
  }, [activeTool]);

  const getToolContext = (): ToolContext => ({
    setPreviewElement,
    previewElement,
    setIsDrawing,
    isDrawing,
    setIsClosingPath,
    drawingStyle,
    onToolUsed,
    onToolChange,
    stagePos,
    setStagePos: onStagePosChange
  });

  const onMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    toolInstanceRef.current?.onMouseDown(e, getToolContext());
  };

  const onMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    toolInstanceRef.current?.onMouseMove(e, getToolContext());
  };

  const onMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    toolInstanceRef.current?.onMouseUp(e, getToolContext());
  };

  const onDblClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    toolInstanceRef.current?.onDblClick(e, getToolContext());
  };

  // Handle stage position updates (centering)
  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.position(stagePos);
      stageRef.current.batchDraw();
    }
  }, [stagePos]);

  // Update cursor based on tool
  useEffect(() => {
    if (stageRef.current) {
      if (activeTool === 'hand') {
        stageRef.current.container().style.cursor = 'grab';
      } else {
        stageRef.current.container().style.cursor = 'default';
      }
    }
  }, [activeTool]);

  // Handle selection transformer
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current || isDrawing) {
      transformerRef.current?.nodes([]);
      return;
    }

    const selectionIds = getSelectedIds(selectedId, selectedIds);
    if (selectionIds.length === 0) {
      transformerRef.current.nodes([]);
      return;
    }

    const selectableIds = selectionIds.filter((id) => {
      const el = elements.find((x) => x.id === id);
      return Boolean(el && !el.locked);
    });

    if (selectableIds.length === 0) {
      transformerRef.current.nodes([]);
      return;
    }

    const nodes = selectableIds
      .map((id) => stageRef.current!.findOne('#' + id))
      .filter(Boolean) as Konva.Node[];

    transformerRef.current.nodes(nodes);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedId, selectedIds, elements, isDrawing]);

  return (
    <Stage
      ref={(node) => {
        (stageRef as any).current = node;
        
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<Konva.Stage | null>).current = node;
        }

        onStageReady?.(node);
      }}
      width={width}
      height={height}
      scaleX={zoom}
      scaleY={zoom}
      x={stagePos.x}
      y={stagePos.y}
      draggable={false}
      onMouseDown={onMouseDown}
      onTouchStart={onMouseDown as any}
      onMouseMove={onMouseMove}
      onTouchMove={onMouseMove as any}
      onMouseUp={onMouseUp}
      onTouchEnd={onMouseUp as any}
      onDblClick={onDblClick}
      onContextMenu={(e) => {
        // Prevent default browser menu
        e.evt.preventDefault();
        
        // 如果正在拖拽选择区域，或者刚刚完成了一次拖拽（针对右键拖拽后的释放），不显示右键菜单
        if (isDraggingSelection || shouldSuppressContextMenu) {
          return;
        }
        
        // Find if we clicked on an element
        // We look up the tree to find a node with an ID that matches an element
        let target: Konva.Node = e.target;
        let elementId: string | undefined;

        // Try to find the group id
        while (target && target !== target.getStage()) {
          if (target.id() && elements.some(el => el.id === target.id())) {
            elementId = target.id();
            break;
          }
          if (target.parent) {
            target = target.parent;
          } else {
            break;
          }
        }

        onContextMenu?.(e, elementId);
      }}
      className="bg-[#fafafa]"
    >
      <Layer>
        {[...elements, ...(previewElement ? [previewElement] : [])].map((el) => {
          if (!el.visible) return null;
          
          const ElementComponent = getElementComponent(el.type);
          if (!ElementComponent) return null;

          // 支持多选高亮
          const isSelected = selectedId === el.id || selectedIds.includes(el.id) || (el.type === 'pen' && el.id === previewElement?.id);
          
          return (
            <ElementComponent
              key={el.id}
              {...el.toState()}
              isSelected={isSelected}
              isEditing={el.isEditing}
              onContextMenu={(e: Konva.KonvaEventObject<PointerEvent>) => {
                  onContextMenu?.(e, el.id);
              }}
            />
          );
        })}
        
        {/* 渲染选择框 */}
        {isSelecting && selectionBox && (
          <Rect
            x={selectionBox.x}
            y={selectionBox.y}
            width={selectionBox.width}
            height={selectionBox.height}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="#3b82f6"
            strokeWidth={1 / zoom}
            dash={[4, 4]}
            listening={false}
          />
        )}
        
        <Transformer
          ref={transformerRef}
          borderStroke="#3b82f6"
          borderDash={[6, 4]}
          borderStrokeWidth={2 / zoom}
          anchorStroke="#3b82f6"
          anchorFill="#ffffff"
          anchorStrokeWidth={2 / zoom}
          anchorSize={10 / zoom}
          boundBoxFunc={(oldBox, newBox) => {
            // limit resize
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }

            // Snap logic
            if (transformerRef.current) {
               const layer = transformerRef.current.getLayer();
               if (layer) {
                  const otherNodes = layer.getChildren().filter(node => {
                     const transformedNode = transformerRef.current?.nodes()[0];
                     return node !== transformedNode && node !== transformerRef.current && node.getClassName() === 'Group' && node.id();
                  });
                  
                  const { shiftX, shiftY, guidelines } = getSnapShift(newBox, otherNodes, layer);
                  
                  if (guidelines.length > 0) {
                     setGuidelines(guidelines);
                  } else if (useWorkspaceStore.getState().guidelines.length > 0) {
                     setGuidelines([]);
                  }
                  
                  return {
                     ...newBox,
                     x: newBox.x + shiftX,
                     y: newBox.y + shiftY,
                  };
               }
            }

            return newBox;
          }}
        />
        
        {/* Alignment Guidelines */}
        {guidelines.map((line: Guideline) => (
          <Line
            key={line.id}
            points={[line.x1, line.y1, line.x2, line.y2]}
            stroke="#DD7D4E"
            strokeWidth={1}
            dash={[4, 4]}
          />
        ))}

        {/* Draw start point indicator for closing path */}
        {isClosingPath && activeTool === 'pen' && isDrawing && previewElement && (
           <Circle 
             x={(previewElement as DrawElementModel).points?.[0] || 0}
             y={(previewElement as DrawElementModel).points?.[1] || 0}
             radius={8}
             stroke="#3b82f6"
             strokeWidth={2}
             fill="transparent"
           />
        )}
      </Layer>
    </Stage>
  );
});

EditorStage.displayName = 'EditorStage';
export default EditorStage;

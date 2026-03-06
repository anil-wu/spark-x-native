import Konva from 'konva';
import { BaseElement } from '../../types/BaseElement';
import { ToolType } from '../../types/ToolType';

export interface ToolContext {
  // UI Rendering & Interaction State
  setPreviewElement: (el: BaseElement | null) => void;
  previewElement: BaseElement | null;
  setIsDrawing: (isDrawing: boolean) => void;
  isDrawing: boolean;
  setIsClosingPath?: (isClosing: boolean) => void;
  
  // External Configuration
  drawingStyle?: { stroke: string; strokeWidth: number };
  stagePos?: { x: number, y: number };
  setStagePos?: (pos: { x: number, y: number }) => void;
  
  // UI Callbacks
  onToolUsed: () => void;
  onToolChange?: (tool: ToolType) => void;
}

export interface IMouseAction {
  type: ToolType;
  onMouseDown(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void;
  onMouseMove(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void;
  onMouseUp(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void;
  onDblClick(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void;
}

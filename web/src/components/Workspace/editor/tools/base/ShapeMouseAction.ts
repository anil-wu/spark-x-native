import Konva from 'konva';
import { BaseMouseAction } from './BaseMouseAction';
import { ToolContext } from '../../interfaces/IMouseAction';
import { ToolType } from '../../../types/ToolType';
import { ElementFactory, TextElement, TextShapeElement } from '../../../types/BaseElement';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export class ShapeMouseAction extends BaseMouseAction {
  type: ToolType;
  private textBase: { height: number; fontSize: number } | null = null;

  constructor(type: ToolType) {
    super();
    this.type = type;
  }

  onMouseDown(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void {
    const { selectedId, elements, updateElement, selectElement } = useWorkspaceStore.getState();
    const { setIsDrawing, setPreviewElement } = context;

    const pos = this.getPointerPosition(e);
    if (!pos) return;

    this.startPos = pos;
    setIsDrawing(true);

    let newEl = ElementFactory.createDefault(this.type, pos.x, pos.y);
    this.textBase =
      newEl instanceof TextElement || newEl instanceof TextShapeElement
        ? { height: Math.max(newEl.height || 1, 1), fontSize: Math.max((newEl as any).fontSize || 1, 1) }
        : null;
    newEl = newEl.update({ width: 0, height: 0 });
    setPreviewElement(newEl);

    if (selectedId) {
      const selectedElement = elements.find(el => el.id === selectedId);
      if (selectedElement && selectedElement.isEditing) {
        updateElement(selectedId, { isEditing: false });
      }
    }
    selectElement(null);
  }

  onMouseMove(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void {
    const { isDrawing, previewElement, setPreviewElement } = context;
    
    if (!isDrawing || !previewElement) return;

    const pos = this.getPointerPosition(e);
    if (!pos) return;

    const width = Math.abs(pos.x - this.startPos.x);
    const height = Math.abs(pos.y - this.startPos.y);
    const newX = Math.min(pos.x, this.startPos.x);
    const newY = Math.min(pos.y, this.startPos.y);

    const updates: any = { x: newX, y: newY, width, height };
    if (this.textBase && height > 0) {
      const nextFontSize = Math.round((this.textBase.fontSize * height) / this.textBase.height);
      updates.fontSize = Math.max(5, Math.min(nextFontSize, 200));
    }

    setPreviewElement(previewElement.update(updates));
  }

  onMouseUp(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void {
    const { addElement, selectElement } = useWorkspaceStore.getState();
    const { 
      isDrawing, previewElement, setPreviewElement, 
      setIsDrawing, onToolChange, onToolUsed 
    } = context;

    if (!isDrawing || !previewElement) return;

    const pos = this.getPointerPosition(e);
    if (!pos) {
       setIsDrawing(false);
       setPreviewElement(null);
       return;
    }

    const dx = pos.x - this.startPos.x;
    const dy = pos.y - this.startPos.y;
    const diagonal = Math.sqrt(dx * dx + dy * dy);

    if (diagonal < 5) { 
        setIsDrawing(false);
        setPreviewElement(null);
        onToolChange?.('select');
        this.textBase = null;
        return;
    }

    addElement(previewElement);
    selectElement(previewElement.id);
    onToolUsed();
    
    setIsDrawing(false);
    setPreviewElement(null);
    this.textBase = null;
  }
}

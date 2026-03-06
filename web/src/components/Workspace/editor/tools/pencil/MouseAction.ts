import Konva from 'konva';
import { DrawMouseAction } from '../base/DrawMouseAction';
import { ToolContext } from '../../interfaces/IMouseAction';
import { ElementFactory, DrawElement } from '../../../types/BaseElement';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export class MouseAction extends DrawMouseAction {
  type = 'pencil' as const;

  onMouseDown(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void {
    const { selectedId, elements, updateElement, selectElement } = useWorkspaceStore.getState();
    const { 
      setIsDrawing, setPreviewElement, drawingStyle 
    } = context;

    const pos = this.getPointerPosition(e);
    if (!pos) return;

    setIsDrawing(true);
    this.startPos = pos;
    
    let newEl = ElementFactory.createDefault(this.type, 0, 0);
    newEl = newEl.update({
      points: [pos.x, pos.y],
      x: 0,
      y: 0,
      ...(drawingStyle ? {
        stroke: drawingStyle.stroke,
        strokeWidth: drawingStyle.strokeWidth
      } : {})
    });

    setPreviewElement(newEl as DrawElement);
    
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

    const drawEl = previewElement as DrawElement;
    // Add new point
    const newPoints = (drawEl.points || []).concat([pos.x, pos.y]);
    setPreviewElement(drawEl.update({ points: newPoints }));
  }

  onMouseUp(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void {
    const { isDrawing, previewElement, setPreviewElement, setIsDrawing } = context;

    if (!isDrawing || !previewElement) return;

    const drawEl = previewElement as DrawElement;
    const points = drawEl.points || [];
    
    if (points.length < 4) { // Need at least 2 points
        setIsDrawing(false);
        setPreviewElement(null);
        return;
    }
    
    this.finishDrawing(drawEl, context);
  }
}

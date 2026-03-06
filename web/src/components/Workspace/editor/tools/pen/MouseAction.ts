import Konva from 'konva';
import { DrawMouseAction } from '../base/DrawMouseAction';
import { ToolContext } from '../../interfaces/IMouseAction';
import { ElementFactory, DrawElement } from '../../../types/BaseElement';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export class MouseAction extends DrawMouseAction {
  type = 'pen' as const;

  onMouseDown(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void {
    const { selectedId, elements, updateElement, selectElement } = useWorkspaceStore.getState();
    const { 
      setIsDrawing, setPreviewElement, drawingStyle, isDrawing: alreadyDrawing, previewElement 
    } = context;

    const pos = this.getPointerPosition(e);
    if (!pos) return;

    if (selectedId) {
      const selectedElement = elements.find(el => el.id === selectedId);
      if (selectedElement && selectedElement.isEditing) {
        updateElement(selectedId, { isEditing: false });
      }
      selectElement(null);
    }

    if (!alreadyDrawing) {
      // Start new Pen path
      setIsDrawing(true);
      this.startPos = pos;
      
      let newEl = ElementFactory.createDefault(this.type, 0, 0);
      newEl = newEl.update({
        points: [pos.x, pos.y, pos.x, pos.y], // Start + Preview Point
        x: 0,
        y: 0,
        ...(drawingStyle ? {
          stroke: drawingStyle.stroke,
          strokeWidth: drawingStyle.strokeWidth
        } : {})
      });
      
      setPreviewElement(newEl as DrawElement);
    } else {
      // Continue existing Pen path
      const drawEl = previewElement as DrawElement;
      const points = drawEl.points || [];
      
      // Check for closing path (click near start)
      if (points.length >= 4) {
        const startX = points[0];
        const startY = points[1];
        const dist = Math.sqrt(Math.pow(pos.x - startX, 2) + Math.pow(pos.y - startY, 2));
        if (dist < 20) {
          // Close path
          this.finishDrawing(drawEl, context, true);
          return;
        }
      }

      // Add new point for the next segment
      const newPoints = [...points, pos.x, pos.y];
      setPreviewElement(drawEl.update({ points: newPoints }));
    }
  }

  onMouseMove(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void {
    const { isDrawing, previewElement, setPreviewElement, setIsClosingPath } = context;

    if (!isDrawing || !previewElement) return;

    const pos = this.getPointerPosition(e);
    if (!pos) return;

    const drawEl = previewElement as DrawElement;
    const points = [...(drawEl.points || [])];
    if (points.length >= 2) {
      // Update last point to follow cursor
      points[points.length - 2] = pos.x;
      points[points.length - 1] = pos.y;
      setPreviewElement(drawEl.update({ points }));

      // Check if we can close path
      if (points.length >= 6) { // At least start + 1 point + cursor point (2*3=6 coords)
        const startX = points[0];
        const startY = points[1];
        const dist = Math.sqrt(Math.pow(pos.x - startX, 2) + Math.pow(pos.y - startY, 2));
        
        // Increase threshold to 20px
        if (dist < 20) {
          setIsClosingPath?.(true);
          // Snap the last point to the start point
          points[points.length - 2] = startX;
          points[points.length - 1] = startY;
          setPreviewElement(drawEl.update({ points }));
        } else {
          setIsClosingPath?.(false);
        }
      } else {
        setIsClosingPath?.(false);
      }
    }
  }

  onMouseUp(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void {
    // Pen drawing is not finished on mouse up
  }

  onDblClick(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void {
    const { isDrawing, previewElement } = context;
    if (isDrawing && previewElement) {
        this.finishDrawing(previewElement as DrawElement, context);
    }
  }
}

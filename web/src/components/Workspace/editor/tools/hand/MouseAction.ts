import Konva from 'konva';
import { BaseMouseAction } from '../base/BaseMouseAction';
import { ToolContext } from '../../interfaces/IMouseAction';
import { ToolType } from '../../../types/ToolType';

export class MouseAction extends BaseMouseAction {
  type: ToolType = 'hand';
  private isDragging: boolean = false;
  private lastPointerPosition: { x: number, y: number } | null = null;

  onMouseDown(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void {
    const stage = e.target.getStage();
    if (!stage) return;
    
    this.isDragging = true;
    this.lastPointerPosition = stage.getPointerPosition();
    
    // Set cursor to grabbing
    stage.container().style.cursor = 'grabbing';
  }

  onMouseMove(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void {
    if (!this.isDragging || !this.lastPointerPosition) return;
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const currentPointerPosition = stage.getPointerPosition();
    if (!currentPointerPosition) return;

    const dx = currentPointerPosition.x - this.lastPointerPosition.x;
    const dy = currentPointerPosition.y - this.lastPointerPosition.y;

    // Update last pointer position
    this.lastPointerPosition = currentPointerPosition;

    // Update stage position
    const { stagePos, setStagePos } = context;
    if (stagePos && setStagePos) {
      setStagePos({
        x: stagePos.x + dx,
        y: stagePos.y + dy
      });
    }
  }

  onMouseUp(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void {
    this.isDragging = false;
    this.lastPointerPosition = null;
    
    // Restore cursor to grab
    const stage = e.target.getStage();
    if (stage) {
      stage.container().style.cursor = 'grab';
    }
  }
}

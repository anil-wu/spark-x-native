import Konva from 'konva';
import { IMouseAction, ToolContext } from '../../interfaces/IMouseAction';
import { ToolType } from '../../../types/ToolType';
import { getStagePos } from '../../utils/stageUtils';

export abstract class BaseMouseAction implements IMouseAction {
  abstract type: ToolType;
  protected startPos: { x: number, y: number } = { x: 0, y: 0 };

  abstract onMouseDown(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void;
  abstract onMouseMove(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void;
  abstract onMouseUp(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void;

  onDblClick(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void {
    // Default implementation does nothing
  }

  protected getPointerPosition(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage();
    if (!stage) return null;
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return null;
    return getStagePos(stage, pointerPosition);
  }
}

import { ToolType } from '../../types/ToolType';
import { isGenericShapeMouseActionTool } from '../../types/toolGroups';
import { IMouseAction } from '../interfaces/IMouseAction';
import { MouseAction as SelectionMouseAction } from './select/MouseAction';
import { MouseAction as RectangleMouseAction } from './rectangle/MouseAction';
import { CircleMouseAction } from './circle/CircleMouseAction';
import { MouseAction as TriangleMouseAction } from './triangle/MouseAction';
import { MouseAction as StarMouseAction } from './star/MouseAction';
import { MouseAction as PencilMouseAction } from './pencil/MouseAction';
import { MouseAction as PenMouseAction } from './pen/MouseAction';
import { MouseAction } from './hand/MouseAction';
import { ShapeMouseAction } from './base/ShapeMouseAction';

const DIRECT_TOOL_CREATORS: Partial<Record<ToolType, () => IMouseAction>> = {
  select: () => new SelectionMouseAction(),
  rectangle: () => new RectangleMouseAction(),
  circle: () => new CircleMouseAction(),
  triangle: () => new TriangleMouseAction(),
  star: () => new StarMouseAction(),
  pencil: () => new PencilMouseAction(),
  pen: () => new PenMouseAction(),
  hand: () => new MouseAction(),
};

export class ToolFactory {
  static createTool(type: ToolType): IMouseAction {
    const createTool = DIRECT_TOOL_CREATORS[type];
    if (createTool) {
      return createTool();
    }

    if (isGenericShapeMouseActionTool(type)) {
      return new ShapeMouseAction(type);
    }

    console.warn(`Tool type "${type}" not implemented, falling back to SelectionMouseAction`);
    return new SelectionMouseAction();
  }
}

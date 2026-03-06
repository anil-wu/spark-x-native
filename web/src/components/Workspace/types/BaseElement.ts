import { ToolType } from './ToolType';
import { isDrawTool, isTextShapeTool } from './toolGroups';
import { 
  ElementState, 
  BaseElementState, 
  ShapeState, 
  TextState, 
  TextShapeState, 
  ImageState, 
  DrawState 
} from './ElementState';

export type { ElementState, BaseElementState };
export type IElementState = ElementState;

export abstract class BaseElement<T extends BaseElementState = BaseElementState> {
  protected readonly state: T;

  constructor(state: T) {
    this.state = { ...state };
  }

  // === 基础属性 ===
  get id() { return this.state.id; }
  get type() { return this.state.type; }
  get name() { return this.state.name; }
  get x() { return this.state.x; }
  get y() { return this.state.y; }
  get width() { return this.state.width; }
  get height() { return this.state.height; }
  get rotation() { return this.state.rotation; }
  get visible() { return this.state.visible; }
  get locked() { return this.state.locked; }
  get isEditing() { return this.state.isEditing; }

  toState(): T {
    return { ...this.state };
  }

  abstract clone(): BaseElement<T>;

  update(props: Partial<T>): BaseElement<T> {
    const newState = { ...this.state, ...props };
    const Constructor = this.constructor as new (state: T) => BaseElement<T>;
    return new Constructor(newState);
  }
}

export class ShapeElement extends BaseElement<ShapeState> {
  get color() { return this.state.color; }
  get stroke() { return this.state.stroke; }
  get strokeWidth() { return this.state.strokeWidth; }
  get strokeStyle() { return this.state.strokeStyle; }
  get cornerRadius() { return this.state.cornerRadius; }
  get sides() { return this.state.sides; }
  get starInnerRadius() { return this.state.starInnerRadius; }

  constructor(state: ShapeState) {
    super(state);
  }

  clone(): ShapeElement {
    return new ShapeElement(this.toState());
  }
}

export class TextElement extends BaseElement<TextState> {
  get text() { return this.state.text; }
  get fontSize() { return this.state.fontSize; }
  get fontFamily() { return this.state.fontFamily; }
  get textColor() { return this.state.textColor; }
  get textStroke() { return this.state.textStroke; }
  get textStrokeWidth() { return this.state.textStrokeWidth; }
  get fontStyle() { return this.state.fontStyle; }
  get align() { return this.state.align; }
  get lineHeight() { return this.state.lineHeight; }
  get letterSpacing() { return this.state.letterSpacing; }
  get textDecoration() { return this.state.textDecoration; }
  get textTransform() { return this.state.textTransform; }

  constructor(state: TextState) {
    super(state);
  }

  clone(): TextElement {
    return new TextElement(this.toState());
  }
}

export class TextShapeElement extends BaseElement<TextShapeState> {
  // Shape Props
  get color() { return this.state.color; }
  get stroke() { return this.state.stroke; }
  get strokeWidth() { return this.state.strokeWidth; }
  get strokeStyle() { return this.state.strokeStyle; }
  get cornerRadius() { return this.state.cornerRadius; }
  
  // Text Props
  get text() { return this.state.text; }
  get fontSize() { return this.state.fontSize; }
  get fontFamily() { return this.state.fontFamily; }
  get textColor() { return this.state.textColor; }
  get textStroke() { return this.state.textStroke; }
  get textStrokeWidth() { return this.state.textStrokeWidth; }
  get fontStyle() { return this.state.fontStyle; }
  get align() { return this.state.align; }
  get lineHeight() { return this.state.lineHeight; }
  get letterSpacing() { return this.state.letterSpacing; }
  get textDecoration() { return this.state.textDecoration; }
  get textTransform() { return this.state.textTransform; }

  constructor(state: TextShapeState) {
    super(state);
  }

  update(props: Partial<TextShapeState>): TextShapeElement {
    return super.update(props) as TextShapeElement;
  }

  clone(): TextShapeElement {
    return new TextShapeElement(this.toState());
  }
}

export class ImageElement extends BaseElement<ImageState> {
  get src() { return this.state.src; }

  constructor(state: ImageState) {
    super(state);
  }

  clone(): ImageElement {
    return new ImageElement(this.toState());
  }
}

export class DrawElement extends BaseElement<DrawState> {
  get points() { return this.state.points; }
  get stroke() { return this.state.stroke; }
  get strokeWidth() { return this.state.strokeWidth; }
  get fill() { return this.state.fill; }

  constructor(state: DrawState) {
    super(state);
  }

  clone(): DrawElement {
    return new DrawElement(this.toState());
  }
}

export class ElementFactory {
  static create(state: ElementState): BaseElement<any> {
    switch (state.type) {
      case 'image':
        return new ImageElement(state as ImageState);
      case 'text':
        return new TextElement(state as TextState);
      case 'pencil':
      case 'pen':
        return new DrawElement(state as DrawState);
      case 'chat-bubble':
      case 'arrow-left':
      case 'arrow-right':
      case 'rectangle-text':
      case 'circle-text':
        return new TextShapeElement(state as TextShapeState);
      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'star':
        return new ShapeElement(state as ShapeState);
      default:
        throw new Error(`Unknown element type: ${(state as any).type}`);
    }
  }

  static createDefault(type: ToolType, x: number, y: number, id?: string): BaseElement<any> {
    const finalId = id || Date.now().toString();
    const baseState: BaseElementState = {
      id: finalId,
      type,
      name: `${type} ${finalId.slice(-4)}`,
      x,
      y,
      width: 100,
      height: 100,
      rotation: 0,
      visible: true,
      locked: false,
    };

    if (type === 'image') {
       return new ImageElement({ 
         ...baseState, 
         type: 'image',
         src: '/role.png', 
         width: 200, 
         height: 300 
       });
    }
    
    if (type === 'text') {
      return new TextElement({
        ...baseState,
        type: 'text',
        width: 200,
        height: 50,
        text: 'Hello World',
        fontSize: 20,
        fontFamily: 'Arial',
        textColor: '#000000'
      });
    }

    if (isTextShapeTool(type)) {
       return new TextShapeElement({
         ...baseState,
         type: type as TextShapeState['type'],
         color: '#8b5cf6',
         text: 'Label',
         textColor: '#ffffff',
         fontSize: 14,
         fontFamily: 'Arial'
       });
    }

    if (isDrawTool(type)) {
      return new DrawElement({
        ...baseState,
        type: type as DrawState['type'],
        width: 0,
        height: 0,
        points: [],
        stroke: '#000000',
        strokeWidth: 2,
      });
    }

    let color = '#3b82f6';
    if (type === 'circle') color = '#ef4444';
    if (type === 'triangle') color = '#10b981';
    if (type === 'star') color = '#f59e0b';

    return new ShapeElement({ 
      ...baseState, 
      type: type as ShapeState['type'],
      color, 
      sides: type === 'star' ? 5 : (type === 'triangle' ? 3 : undefined), 
      starInnerRadius: type === 'star' ? 50 : undefined 
    });
  }
}

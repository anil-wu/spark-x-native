import { 
  ElementState, 
  ShapeState, 
  TextShapeState,
  BaseElementState
} from './ElementState';

// 基础 Props，所有组件通用
export type BaseElementProps<T extends BaseElementState = BaseElementState> = T & {
  isSelected: boolean;
  isEditing?: boolean;
  draggable?: boolean;
};

// 具体的 Props 类型
export type ShapeElementProps = BaseElementProps<ShapeState>;
export type TextShapeElementProps = BaseElementProps<TextShapeState>;

// 如果需要，可以导出联合类型 Props
export type ElementProps = BaseElementProps<ElementState>;

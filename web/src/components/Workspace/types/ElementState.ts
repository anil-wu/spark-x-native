import { ToolType } from './ToolType';

// === 基础状态 ===
export interface BaseElementState {
  id: string;
  type: ToolType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  visible: boolean;
  locked: boolean;
  isEditing?: boolean;
}

// === 具体状态定义 ===

// 1. 形状 (Shape)
export interface ShapeState extends BaseElementState {
  type: 'rectangle' | 'circle' | 'triangle' | 'star';
  color: string;
  stroke?: string;
  strokeWidth?: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  cornerRadius?: number; // Rectangle only
  sides?: number; // Triangle, Polygon
  starInnerRadius?: number; // Star only
}

// 2. 文本 (Text)
export interface TextState extends BaseElementState {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  textStroke?: string;
  textStrokeWidth?: number;
  fontStyle?: string;
  align?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textDecoration?: string;
  textTransform?: string;
}

// 3. 形状文本 (TextShape) - 像气泡框、带文字的图形
export interface TextShapeState extends BaseElementState {
  type: 'chat-bubble' | 'arrow-left' | 'arrow-right' | 'rectangle-text' | 'circle-text';
  // 形状属性
  color: string;
  stroke?: string;
  strokeWidth?: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  cornerRadius?: number;
  
  // 文本属性
  text: string;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  textStroke?: string;
  textStrokeWidth?: number;
  fontStyle?: string;
  align?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textDecoration?: string;
  textTransform?: string;
}

// 4. 图片 (Image)
export interface ImageState extends BaseElementState {
  type: 'image';
  src: string;
}

// 5. 绘图 (Draw) - 铅笔、钢笔
export interface DrawState extends BaseElementState {
  type: 'pencil' | 'pen';
  points: number[];
  stroke: string;
  strokeWidth: number;
  fill?: string;
  tension?: number;
}

// === 联合类型 (The Discriminated Union) ===
export type ElementState = 
  | ShapeState 
  | TextState 
  | TextShapeState 
  | ImageState 
  | DrawState;

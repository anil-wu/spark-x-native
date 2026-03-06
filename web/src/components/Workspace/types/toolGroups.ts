import { ToolType } from './ToolType';

export const BASIC_SHAPE_TOOLS = ['rectangle', 'circle', 'triangle', 'star'] as const;
export type BasicShapeToolType = (typeof BASIC_SHAPE_TOOLS)[number];

export const TEXT_SHAPE_TOOLS = ['chat-bubble', 'arrow-left', 'arrow-right', 'rectangle-text', 'circle-text'] as const;
export type TextShapeToolType = (typeof TEXT_SHAPE_TOOLS)[number];

export const SHAPE_TOOLS = ['rectangle', 'circle', 'triangle', 'star', 'chat-bubble', 'arrow-left', 'arrow-right', 'rectangle-text', 'circle-text'] as const;
export type ShapeToolType = (typeof SHAPE_TOOLS)[number];

export const DRAW_TOOLS = ['pencil', 'pen'] as const;
export type DrawToolType = (typeof DRAW_TOOLS)[number];

export const SELECT_TOOLS = ['select', 'hand'] as const;
export type SelectToolType = (typeof SELECT_TOOLS)[number];

export const TEXT_LIKE_TOOLS = ['text', 'chat-bubble', 'arrow-left', 'arrow-right', 'rectangle-text', 'circle-text'] as const;
export type TextLikeToolType = (typeof TEXT_LIKE_TOOLS)[number];

export const GENERIC_SHAPE_MOUSE_ACTION_TOOLS = ['chat-bubble', 'arrow-left', 'arrow-right', 'rectangle-text', 'circle-text', 'text', 'image'] as const;
export type GenericShapeMouseActionToolType = (typeof GENERIC_SHAPE_MOUSE_ACTION_TOOLS)[number];

const DRAW_TOOL_SET: ReadonlySet<ToolType> = new Set(DRAW_TOOLS);
const SHAPE_TOOL_SET: ReadonlySet<ToolType> = new Set(SHAPE_TOOLS);
const SELECT_TOOL_SET: ReadonlySet<ToolType> = new Set(SELECT_TOOLS);
const TEXT_SHAPE_TOOL_SET: ReadonlySet<ToolType> = new Set(TEXT_SHAPE_TOOLS);
const TEXT_LIKE_TOOL_SET: ReadonlySet<ToolType> = new Set(TEXT_LIKE_TOOLS);
const GENERIC_SHAPE_MOUSE_ACTION_SET: ReadonlySet<ToolType> = new Set(GENERIC_SHAPE_MOUSE_ACTION_TOOLS);

export const isDrawTool = (tool: ToolType): tool is DrawToolType => DRAW_TOOL_SET.has(tool);
export const isShapeTool = (tool: ToolType): tool is ShapeToolType => SHAPE_TOOL_SET.has(tool);
export const isSelectTool = (tool: ToolType): tool is SelectToolType => SELECT_TOOL_SET.has(tool);
export const isTextShapeTool = (tool: ToolType): tool is TextShapeToolType => TEXT_SHAPE_TOOL_SET.has(tool);
export const isTextLikeTool = (tool: ToolType): tool is TextLikeToolType => TEXT_LIKE_TOOL_SET.has(tool);
export const isGenericShapeMouseActionTool = (
  tool: ToolType,
): tool is GenericShapeMouseActionToolType => GENERIC_SHAPE_MOUSE_ACTION_SET.has(tool);

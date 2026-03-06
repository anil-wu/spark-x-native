import React from 'react';
import ImageElement from './image/Element';
import ShapeElement from './shape/Element';
import TextElement from './text/Element';
import TextRectangleElement from './text-rectangle/Element';
import TextCircleElement from './text-circle/Element';
import TextChatBubbleElement from './chat-bubble/Element';
import TextArrowLeftElement from './arrow/LeftElement';
import TextArrowRightElement from './arrow/RightElement';
import PencilElement from './pencil/Element';
import PenElement from './pen/Element';
import { ToolType } from '../../types/ToolType';

// Define a registry mapping tool types to their respective React components
export const ElementRegistry: Record<string, React.FC<any>> = {
  // Basic Shapes (handled by generic ShapeElement which switches on type internally)
  'rectangle': ShapeElement,
  'circle': ShapeElement,
  'triangle': ShapeElement,
  'star': ShapeElement,

  // Image
  'image': ImageElement,

  // Text
  'text': TextElement,

  // Text Shapes
  'rectangle-text': TextRectangleElement,
  'circle-text': TextCircleElement,
  'chat-bubble': TextChatBubbleElement,
  'arrow-left': TextArrowLeftElement,
  'arrow-right': TextArrowRightElement,

  // Drawing
  'pencil': PencilElement,
  'pen': PenElement,
};

export const getElementComponent = (type: ToolType): React.FC<any> | null => {
  return ElementRegistry[type] || null;
};

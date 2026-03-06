"use client";

import React from 'react';
import { BaseElement } from '../../../types/BaseElement';
import { ToolType } from '../../../types/ToolType';
import RectangleInspectorBar from '../rectangle/InspectorBar';
import CircleInspectorBar from '../circle/InspectorBar';
import TriangleInspectorBar from '../triangle/InspectorBar';
import StarInspectorBar from '../star/InspectorBar';
import ChatBubbleInspectorBar from '../chat-bubble/InspectorBar';
import ArrowInspectorBar from '../arrow/InspectorBar';
import TextRectangleInspectorBar from '../text-rectangle/InspectorBar';
import TextCircleInspectorBar from '../text-circle/InspectorBar';

interface ShapeInspectorBarProps {
  element: BaseElement<any>;
  onUpdate: (updates: Partial<any>) => void;
  onDownload?: () => void;
}

const SHAPE_INSPECTOR_COMPONENTS: Partial<Record<ToolType, React.ComponentType<ShapeInspectorBarProps>>> = {
  rectangle: RectangleInspectorBar,
  circle: CircleInspectorBar,
  triangle: TriangleInspectorBar,
  star: StarInspectorBar,
  'chat-bubble': ChatBubbleInspectorBar,
  'arrow-left': ArrowInspectorBar,
  'arrow-right': ArrowInspectorBar,
  'rectangle-text': TextRectangleInspectorBar,
  'circle-text': TextCircleInspectorBar,
};

export default function ShapeInspectorBar(props: ShapeInspectorBarProps) {
  const { element } = props;
  const InspectorComponent = SHAPE_INSPECTOR_COMPONENTS[element.type] ?? RectangleInspectorBar;
  return <InspectorComponent {...props} />;
}

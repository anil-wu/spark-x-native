import React from 'react';
import { BaseElementProps, ShapeElementProps } from '../../../types/ElementProps';
import { ToolType } from '../../../types/ToolType';
import RectangleElement from '../rectangle/Element';
import CircleElement from '../circle/Element';
import TriangleElement from '../triangle/Element';
import StarElement from '../star/Element';

export { type ShapeElementProps };

export default function ShapeElement(props: ShapeElementProps) {
  const { type } = props;

  switch (type) {
    case 'rectangle':
      return <RectangleElement {...props} />;
    case 'circle':
      return <CircleElement {...props} />;
    case 'triangle':
      return <TriangleElement {...props} />;
    case 'star':
      return <StarElement {...props} />;
    default:
      return <RectangleElement {...props} />;
  }
}


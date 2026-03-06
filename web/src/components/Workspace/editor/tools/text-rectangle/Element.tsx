import React from 'react';
import { Rect } from 'react-konva';
import TextShapeElement, { TextShapeElementProps } from '../TextShapeElement';

export default function TextRectangleElement(props: TextShapeElementProps) {
  const { width, height, color = '#3b82f6', stroke, strokeWidth, strokeStyle, cornerRadius } = props;
  
  const dash = strokeStyle === 'dashed' ? [10, 5] : (strokeStyle === 'dotted' ? [2, 2] : undefined);

  return (
    <TextShapeElement {...props}>
      <Rect 
        width={width} 
        height={height} 
        fill={color} 
        stroke={stroke}
        strokeWidth={strokeWidth}
        dash={dash}
        cornerRadius={cornerRadius}
      />
    </TextShapeElement>
  );
}

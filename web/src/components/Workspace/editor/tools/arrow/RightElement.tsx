import React from 'react';
import { Path } from 'react-konva';
import TextShapeElement, { TextShapeElementProps } from '../TextShapeElement';

export default function TextArrowRightElement(props: TextShapeElementProps) {
    const { width, height, color = '#3b82f6', stroke, strokeWidth, strokeStyle } = props;

    const dash = strokeStyle === 'dashed' ? [10, 5] : (strokeStyle === 'dotted' ? [2, 2] : undefined);

    const headLength = width * 0.4;
    const tailLength = width - headLength;
    const tailThickness = height * 0.5;
    const headSpan = height * 0.9;
    
    const cY = height / 2;
    const tailTop = cY - tailThickness / 2;
    const tailBottom = cY + tailThickness / 2;
    const headTop = cY - headSpan / 2;
    const headBottom = cY + headSpan / 2;

    const pathData = `
      M 0 ${tailTop}
      L ${tailLength} ${tailTop}
      L ${tailLength} ${headTop}
      L ${width} ${cY}
      L ${tailLength} ${headBottom}
      L ${tailLength} ${tailBottom}
      L 0 ${tailBottom}
      Z
    `;

  return (
    <TextShapeElement {...props}>
       <Path
         data={pathData}
         fill={color}
         stroke={stroke || color}
         strokeWidth={strokeWidth !== undefined ? strokeWidth : 8}
         dash={dash}
         lineJoin="round"
         lineCap="round"
       />
    </TextShapeElement>
  );
}

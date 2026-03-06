import React from 'react';
import { Ellipse, Rect } from 'react-konva';
import { ElementWrapper } from '../ElementWrapper';
import { ShapeElementProps } from '../shape/Element';

export default function CircleElement(props: ShapeElementProps) {
  const { width, height, color = '#3b82f6', stroke, strokeWidth, strokeStyle, cornerRadius } = props;

  const getDash = () => {
    switch (strokeStyle) {
      case 'dashed': return [10, 5];
      case 'dotted': return [2, 2];
      default: return undefined;
    }
  };

  return (
    <ElementWrapper {...props}>
      {cornerRadius !== undefined ? (
        <Rect
          width={width}
          height={height}
          fill={color}
          stroke={stroke}
          strokeWidth={strokeWidth}
          dash={getDash()}
          cornerRadius={cornerRadius}
        />
      ) : (
        <Ellipse
          x={width / 2}
          y={height / 2}
          radiusX={width / 2}
          radiusY={height / 2}
          fill={color}
          stroke={stroke}
          strokeWidth={strokeWidth}
          dash={getDash()}
        />
      )}
    </ElementWrapper>
  );
}

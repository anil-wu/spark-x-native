import React from 'react';
import { Line } from 'react-konva';
import { ElementWrapper } from '../ElementWrapper';
import { BaseElementProps } from '../../../types/ElementProps';

export interface DrawElementProps extends BaseElementProps {
  points?: number[];
  stroke?: string;
  strokeWidth?: number;
  tension?: number;
  fill?: string;
}

export default function PencilElement(props: DrawElementProps) {
  const { 
    points = [], 
    stroke = '#000000', 
    strokeWidth = 2, 
    fill = 'transparent',
    // tension is ignored for pencil
    width,
    height 
  } = props;

  // points are relative to the group (which is at x, y)
  // If we normalize points, we don't need to do anything special here.
  
  return (
    <ElementWrapper {...props}>
      <Line
        points={points}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill={fill}
        tension={0}
        lineCap="round"
        lineJoin="round"
        // Ensure hit detection works well
        hitStrokeWidth={Math.max(strokeWidth, 10)}
      />
    </ElementWrapper>
  );
}

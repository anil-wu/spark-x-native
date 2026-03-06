import React from 'react';
import { Line, Circle } from 'react-konva';
import { ElementWrapper } from '../ElementWrapper';
import { BaseElementProps } from '../../../types/ElementProps';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export interface DrawElementProps extends BaseElementProps {
  points?: number[];
  stroke?: string;
  strokeWidth?: number;
  tension?: number;
  fill?: string;
}

export default function PenElement(props: DrawElementProps) {
  const { updateElement } = useWorkspaceStore();
  const { 
    id,
    points = [], 
    stroke = '#000000', 
    strokeWidth = 2, 
    fill = 'transparent',
    width,
    height,
    isSelected 
  } = props;

  // Helper to render nodes
  const renderNodes = () => {
    if (!isSelected) return null;
    
    const nodes = [];
    for (let i = 0; i < points.length; i += 2) {
      nodes.push(
        <Circle
          key={i}
          x={points[i]}
          y={points[i + 1]}
          radius={4}
          fill="#ffffff"
          stroke="#3b82f6"
          strokeWidth={1.5}
        />
      );
    }
    return nodes;
  };

  // Handle click on line to add node
  const handleLineClick = (e: any) => {
    // Only allow adding nodes if selected
    if (!isSelected) return;

    const stage = e.target.getStage();
    if (!stage) return;
    
    // Robust coordinate transformation
    // We need the pointer position relative to the Line's coordinate system (which matches 'points')
    const transform = e.target.getAbsoluteTransform().copy();
    transform.invert();
    const pos = stage.getPointerPosition();
    if (!pos) return;
    
    const localPos = transform.point(pos);
    const x = localPos.x;
    const y = localPos.y;

    // Find the closest segment
    let closestDist = Infinity;
    let insertIndex = -1;
    // Increase hit threshold for better UX
    const THRESHOLD = 10; 

    for (let i = 0; i < points.length - 2; i += 2) {
      const x1 = points[i];
      const y1 = points[i+1];
      const x2 = points[i+2];
      const y2 = points[i+3];

      // Distance from point to line segment
      const A = x - x1;
      const B = y - y1;
      const C = x2 - x1;
      const D = y2 - y1;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;
      if (lenSq !== 0) // in case of 0 length line
          param = dot / lenSq;

      let xx, yy;

      if (param < 0) {
        xx = x1;
        yy = y1;
      }
      else if (param > 1) {
        xx = x2;
        yy = y2;
      }
      else {
        xx = x1 + param * C;
        yy = y1 + param * D;
      }

      const dx = x - xx;
      const dy = y - yy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Check if this is the closest segment and we are reasonably close to it
      if (dist < closestDist) {
        closestDist = dist;
        insertIndex = i + 2; // Insert after the first point of the segment
      }
    }

    // Also check closing segment if filled or closed
    if (points.length >= 6 && (fill !== 'transparent')) {
       const x1 = points[points.length - 2];
       const y1 = points[points.length - 1];
       const x2 = points[0];
       const y2 = points[1];
       
       // ... same logic ...
       // For now let's just handle open path segments or simplify the loop to include closing if needed
       // But 'Line' in Konva handles 'closed' property visually, the points array doesn't necessarily repeat the start.
       // If closed=true, there is an implicit segment from last to first.
       
       const A = x - x1;
       const B = y - y1;
       const C = x2 - x1;
       const D = y2 - y1;
       const dot = A * C + B * D;
       const lenSq = C * C + D * D;
       let param = -1;
       if (lenSq !== 0) param = dot / lenSq;
       
       let xx, yy;
       if (param < 0) { xx = x1; yy = y1; }
       else if (param > 1) { xx = x2; yy = y2; }
       else { xx = x1 + param * C; yy = y1 + param * D; }
       
       const dx = x - xx;
       const dy = y - yy;
       const dist = Math.sqrt(dx * dx + dy * dy);
       
       if (dist < closestDist) {
           closestDist = dist;
           insertIndex = points.length; // Append to end (which connects to start)
       }
    }

    if (insertIndex !== -1 && closestDist <= THRESHOLD) {
      // Insert point
      const newPoints = [...points];
      newPoints.splice(insertIndex, 0, x, y);
      // updateElement(id, { points: newPoints });
      // Stop bubbling so we don't trigger group selection toggles
      e.cancelBubble = true; 
    }
  };

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
        closed={fill !== 'transparent'}
        // Increase hit area for easier clicking
        hitStrokeWidth={20}
        onClick={handleLineClick}
        onTap={handleLineClick}
      />
      {renderNodes()}
    </ElementWrapper>
  );
}

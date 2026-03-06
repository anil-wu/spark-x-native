import React from 'react';
import { Path } from 'react-konva';
import TextShapeElement, { TextShapeElementProps } from '../TextShapeElement';

export default function TextChatBubbleElement(props: TextShapeElementProps) {
  const { width, height, color = '#3b82f6', stroke, strokeWidth, strokeStyle, cornerRadius = 20 } = props;
  
  const dash = strokeStyle === 'dashed' ? [10, 5] : (strokeStyle === 'dotted' ? [2, 2] : undefined);

  const getBubblePath = (w: number, h: number, r: number) => {
    const tailHeight = 15;
    // Add top offset to center the bubble body vertically relative to the text
    // Text is centered in height, so we want the bubble body (excluding tail) to be centered too.
    // We reserve space for tail at bottom, so we should reserve same space at top.
    const topOffset = tailHeight;
    const bh = h - tailHeight - topOffset;
    const safeR = Math.min(r, w / 2, bh / 2);
    
    if (bh <= 0) return '';

    // Tail parameters
    const t1 = 45; // Start of tail on bottom edge
    const t2 = 15; // Tip x
    const t3 = 25; // Return to bottom edge x
    
    // Ensure we have enough width
    if (w < t1 + safeR) {
        // Fallback or clamp could be added here
    }

    return `
      M ${safeR} ${topOffset}
      L ${w - safeR} ${topOffset}
      Q ${w} ${topOffset} ${w} ${safeR + topOffset}
      L ${w} ${bh + topOffset - safeR}
      Q ${w} ${bh + topOffset} ${w - safeR} ${bh + topOffset}
      L ${t1} ${bh + topOffset}
      L ${t2} ${h}
      L ${t3} ${bh + topOffset}
      L ${safeR} ${bh + topOffset}
      Q 0 ${bh + topOffset} 0 ${bh + topOffset - safeR}
      L 0 ${safeR + topOffset}
      Q 0 ${topOffset} ${safeR} ${topOffset}
      Z
    `;
  };

  return (
    <TextShapeElement {...props}>
      <Path
        data={getBubblePath(width, height, cornerRadius)}
        fill={color}
        stroke={stroke}
        strokeWidth={strokeWidth}
        dash={dash}
        lineJoin="round"
        lineCap="round"
      />
    </TextShapeElement>
  );
}

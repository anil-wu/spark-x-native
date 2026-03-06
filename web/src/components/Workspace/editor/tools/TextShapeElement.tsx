import React, { useState, useRef, useEffect } from 'react';
import { Text as KonvaText } from 'react-konva';
import { Html } from 'react-konva-utils';
import { ElementWrapper } from './ElementWrapper';
import { BaseElementProps, TextShapeElementProps } from '../../types/ElementProps';
import { ToolType } from '../../types/ToolType';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export { type TextShapeElementProps };

export default function TextShapeElement(props: TextShapeElementProps & { children?: React.ReactNode }) {
  const { 
    id,
    width, 
    height, 
    text = '', 
    fontSize = 14, 
    fontFamily = 'Arial', 
    textColor = '#ffffff',
    textStroke,
    textStrokeWidth,
    isEditing: isEditingProp,
    fontStyle = 'normal',
    align = 'center',
    lineHeight = 1.2,
    letterSpacing = 0,
    textDecoration = '',
    textTransform = '',
    children
  } = props;

  const { updateElement } = useWorkspaceStore();
  const isEditing = isEditingProp || false;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Intentionally left empty to prevent stopping editing when clicking toolbar.
    // Editing will be stopped by global click handlers or selection changes.
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateElement(id, { text: e.target.value });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation(); 
    if (e.key === 'Escape') {
      updateElement(id, { isEditing: false });
    }
  };

  const getCssStyles = (fontStyle: string) => {
    const styles: React.CSSProperties = {};
    if (fontStyle.includes('bold')) {
      styles.fontWeight = 'bold';
    } else {
      styles.fontWeight = 'normal';
    }
    
    if (fontStyle.includes('italic')) {
       styles.fontStyle = 'italic';
     } else {
       styles.fontStyle = 'normal';
     }

     if (textDecoration) {
         styles.textDecoration = textDecoration;
         // Handle overline if not supported natively by some browsers in textarea, 
         // but 'overline' is standard CSS.
      }

     if (textTransform) {
        styles.textTransform = textTransform as any;
     }

     if (lineHeight) {
        styles.lineHeight = lineHeight;
     }

     if (letterSpacing) {
        // CSS letter-spacing is usually in px or em, but Konva might use px directly
        // The input in advanced panel is percentage or similar? Let's assume px for now or em
        // Actually the panel input is just a number. 
        // Konva Text letterSpacing is in pixels.
        styles.letterSpacing = `${letterSpacing}px`;
     }

     return styles;
   };

  const cssFontStyles = getCssStyles(fontStyle);

  return (
    <ElementWrapper {...props}>
       {children}
       <KonvaText
          text={text}
          fontSize={fontSize}
          fontFamily={fontFamily}
          fontStyle={fontStyle}
          align={align}
          lineHeight={lineHeight}
          letterSpacing={letterSpacing}
          textDecoration={textDecoration}
          fill={textColor}
          stroke={textStroke}
          strokeWidth={textStrokeWidth}
          width={width}
          height={height}
          verticalAlign="middle"
          offsetX={0} 
          offsetY={0}
          listening={false} 
          visible={!isEditing}
       />
       {isEditing && (
          <Html>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: width,
                height: height,
                position: 'absolute',
                top: 0,
                left: 0,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                color: textColor,
                fontSize: `${fontSize}px`,
                fontFamily: fontFamily,
                fontWeight: cssFontStyles.fontWeight,
                fontStyle: cssFontStyles.fontStyle,
                textDecoration: cssFontStyles.textDecoration,
                textTransform: cssFontStyles.textTransform,
                lineHeight: cssFontStyles.lineHeight,
                letterSpacing: cssFontStyles.letterSpacing,
                textAlign: align as any,
                // lineHeight: 'normal',
                paddingTop: height ? (height - (fontSize || 14)) / 2 + 'px' : '0px',
                // This centering is approximate
                WebkitTextStroke: textStroke && textStrokeWidth ? `${textStrokeWidth}px ${textStroke}` : 'initial'
              }}
            />
          </Html>
       )}
    </ElementWrapper>
  );
}

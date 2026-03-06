import React, { useRef, useEffect } from 'react';
import { Text as KonvaText } from 'react-konva';
import { ElementWrapper, BaseElementProps } from '../ElementWrapper';
import { Html } from 'react-konva-utils';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

interface TextElementProps extends BaseElementProps {
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  textColor?: string; // Add support for textColor alias
  textStroke?: string;
  textStrokeWidth?: number;
  isEditing?: boolean;
  onEditEnd?: (newText: string) => void;
  fontStyle?: string;
  align?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textDecoration?: string;
  textTransform?: string;
}

export default function TextElement(props: TextElementProps) {
  const { 
    id,
    text = 'Text', 
    fontSize = 20, 
    fontFamily = 'Arial', 
    fill,
    textColor,
    textStroke,
    textStrokeWidth,
    isEditing = false,
    onEditEnd,
    width,
    height,
    fontStyle = 'normal',
    align = 'left',
    lineHeight = 1.2,
    letterSpacing = 0,
    textDecoration = '',
    textTransform = '',
  } = props;

  const { updateElement } = useWorkspaceStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(text.length, text.length);
    }
  }, [isEditing, text.length]);

  const finalFill = fill || textColor || '#000000';

  return (
    <ElementWrapper {...props}>
       <KonvaText
         text={text}
         fontSize={fontSize}
         fontFamily={fontFamily}
         fontStyle={fontStyle}
         align={align as any}
         lineHeight={lineHeight}
         letterSpacing={letterSpacing}
         textDecoration={textDecoration}
         stroke={textStroke}
         strokeWidth={textStrokeWidth}
         fill={finalFill}
         width={width}
         height={height}
         visible={!isEditing}
         // listening={false}
       />
       {isEditing && (
         <Html>
           <textarea
             ref={textareaRef}
             value={text}
             onChange={(e) => updateElement(id, { text: e.target.value })}
             onKeyDown={(e) => {
               e.stopPropagation();
               if (e.key === 'Escape') {
                 updateElement(id, { isEditing: false });
               }
             }}
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
               color: finalFill,
               fontSize: `${fontSize}px`,
               fontFamily: fontFamily,
               fontWeight: fontStyle.includes('bold') ? 'bold' : 'normal',
               fontStyle: fontStyle.includes('italic') ? 'italic' : 'normal',
               textDecoration: textDecoration,
               textTransform: textTransform as any,
               lineHeight: lineHeight,
               letterSpacing: `${letterSpacing}px`,
               textAlign: align as any,
               padding: '0px',
               WebkitTextStroke: textStroke && textStrokeWidth ? `${textStrokeWidth}px ${textStroke}` : 'initial',
             }}
           />
         </Html>
       )}
    </ElementWrapper>
  );
}

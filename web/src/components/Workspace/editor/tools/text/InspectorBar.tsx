"use client";

import React, { useState, useRef } from 'react';
import { AlignLeft, AlignCenter, AlignRight, Download, SlidersHorizontal, Pencil } from 'lucide-react';
import { BaseElement } from '../../../types/BaseElement';
import { StrokePanel } from '../shared/StrokePanel';
import { TextAdvancedPanel } from './AdvancedPanel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TextInspectorBarProps {
  element: BaseElement<any>;
  onUpdate: (updates: Partial<any>) => void;
  onDownload?: () => void;
}

const FONT_FAMILIES = [
  'Inter', 'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'
];

const FONT_SIZES = [
  12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 64, 72, 96
];

export default function TextInspectorBar({ element, onUpdate, onDownload }: TextInspectorBarProps) {
  const [showStrokePanel, setShowStrokePanel] = useState(false);
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
  const strokeButtonRef = useRef<HTMLButtonElement>(null);

  const el = element as any;
  const textColor = el.textColor || '#000000';
  const stroke = el.textStroke; 
  const strokeWidth = el.textStrokeWidth || 2;
  const fontFamily = el.fontFamily || 'Inter';
  const fontSize = el.fontSize || 14;
  const fontStyle = el.fontStyle || 'normal';
  const align = el.align || 'center';

  // Helper to parse font style
  // Konva uses 'normal', 'bold', 'italic', 'italic bold'
  // Let's simplify to a dropdown
  
  return (
    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 whitespace-nowrap z-50">
      {/* Text Color */}
      <div className="relative group flex items-center gap-2 pr-2 border-r border-gray-200">
        <div 
            className="w-8 h-8 rounded-full border border-gray-200 cursor-pointer hover:scale-105 transition-transform shadow-sm"
            style={{ backgroundColor: textColor }}
            onClick={() => document.getElementById('text-color-input')?.click()}
        />
        <input 
            id="text-color-input"
            type="color" 
            value={textColor}
            onChange={(e) => onUpdate({ textColor: e.target.value })}
            className="absolute opacity-0 w-0 h-0"
        />
        {/* Transparent/None indicator from image - simplified as a style icon or similar if needed */}
        {/* For now, just the color picker circle as primary interaction */}
      </div>

      {/* Stroke Color */}
      <div className="relative group flex items-center gap-2 pr-2 border-r border-gray-200">
         <button 
            ref={strokeButtonRef}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-gray-100 ${stroke ? 'text-gray-900' : 'text-gray-400'}`}
            onClick={() => setShowStrokePanel(!showStrokePanel)}
            title="Stroke Color"
         >
            <div className="relative">
                <Pencil size={18} />
                {stroke && (
                    <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ backgroundColor: stroke }}></div>
                )}
                {!stroke && (
                     <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white bg-red-500 flex items-center justify-center">
                        <div className="w-1.5 h-0.5 bg-white transform rotate-45"></div>
                     </div>
                )}
            </div>
         </button>
         
         {showStrokePanel && (
             <StrokePanel 
                 stroke={stroke}
                 strokeWidth={strokeWidth}
                 onUpdate={(updates) => {
                     // Map stroke updates to textStroke updates
                     const mappedUpdates: any = {};
                     if (updates.stroke !== undefined) mappedUpdates.textStroke = updates.stroke;
                     if (updates.strokeWidth !== undefined) mappedUpdates.textStrokeWidth = updates.strokeWidth;
                     onUpdate(mappedUpdates);
                 }}
                 onClose={() => setShowStrokePanel(false)}
             />
          )}
      </div>

      {/* Font Family */}
      <div className="w-32">
        <Select
          value={fontFamily}
          onValueChange={(value) => onUpdate({ fontFamily: value })}
        >
          <SelectTrigger className="h-9 border-gray-200 bg-transparent text-sm font-medium text-gray-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((font) => (
              <SelectItem key={font} value={font}>
                {font}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Weight/Style */}
      <div className="w-28">
        <Select
          value={fontStyle}
          onValueChange={(value) => onUpdate({ fontStyle: value })}
        >
          <SelectTrigger className="h-9 border-gray-200 bg-transparent text-sm font-medium text-gray-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Regular</SelectItem>
            <SelectItem value="bold">Bold</SelectItem>
            <SelectItem value="italic">Italic</SelectItem>
            <SelectItem value="italic bold">Bold Italic</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Font Size */}
      <div className="w-20">
        <Select
          value={String(fontSize)}
          onValueChange={(value) => onUpdate({ fontSize: parseInt(value, 10) })}
        >
          <SelectTrigger className="h-9 border-gray-200 bg-transparent text-sm font-medium text-gray-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-1 border-l border-gray-200 pl-2">
         <button 
            className={`p-1.5 rounded-lg transition-colors ${align === 'left' ? 'bg-gray-200 text-gray-900' : 'hover:bg-gray-100 text-gray-600'}`}
            onClick={() => onUpdate({ align: 'left' })}
            title="Align Left"
         >
            <AlignLeft size={18} />
         </button>
         <button 
            className={`p-1.5 rounded-lg transition-colors ${align === 'center' ? 'bg-gray-200 text-gray-900' : 'hover:bg-gray-100 text-gray-600'}`}
            onClick={() => onUpdate({ align: 'center' })}
            title="Align Center"
         >
            <AlignCenter size={18} />
         </button>
         <button 
            className={`p-1.5 rounded-lg transition-colors ${align === 'right' ? 'bg-gray-200 text-gray-900' : 'hover:bg-gray-100 text-gray-600'}`}
            onClick={() => onUpdate({ align: 'right' })}
            title="Align Right"
         >
            <AlignRight size={18} />
         </button>
      </div>
      
      {/* Settings */}
      <div className="relative">
        <button 
           className={`p-1.5 rounded-lg transition-colors ${showAdvancedPanel ? 'bg-gray-100 text-gray-900' : 'hover:bg-gray-100 text-gray-600'}`}
           onClick={() => setShowAdvancedPanel(!showAdvancedPanel)}
           title="Advanced Settings"
        >
          <SlidersHorizontal size={18} />
        </button>

        {showAdvancedPanel && (
           <TextAdvancedPanel 
               element={el}
               onUpdate={onUpdate}
               onClose={() => setShowAdvancedPanel(false)}
           />
        )}
      </div>

      {/* Download */}
      {onDownload && (
        <button 
          onClick={onDownload}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors ml-1"
        >
          <Download size={18} />
        </button>
      )}
    </div>
  );
}

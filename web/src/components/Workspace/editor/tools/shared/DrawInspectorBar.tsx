import React, { useState, useRef } from 'react';
import { AlignJustify, Download } from 'lucide-react';
import { BaseElement } from '../../../types/BaseElement';
import { StrokePanel } from '../shared/StrokePanel';

interface DrawInspectorBarProps {
  element: BaseElement<any> | { stroke?: string; strokeWidth?: number };
  onUpdate: (updates: Partial<any>) => void;
  onDownload?: () => void;
}

export default function DrawInspectorBar({ element, onUpdate, onDownload }: DrawInspectorBarProps) {
  const [showStrokePanel, setShowStrokePanel] = useState(false);
  const strokeButtonRef = useRef<HTMLButtonElement>(null);

  const el = element as any;
  const stroke = el.stroke || '#000000';
  const strokeWidth = el.strokeWidth || 2;

  return (
    <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 whitespace-nowrap relative">
      
      {/* Stroke Color Indicator (Circle) */}
      <div className="relative">
         <button 
            ref={strokeButtonRef}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            onClick={() => setShowStrokePanel(!showStrokePanel)}
            title="Stroke Color"
         >
            {/* Design matching the user image: A thick ring */}
            <div 
                className="w-6 h-6 rounded-full border-[3px]" 
                style={{ borderColor: stroke }}
            />
         </button>
         
         {showStrokePanel && (
            <StrokePanel 
                stroke={stroke}
                strokeWidth={strokeWidth}
                onUpdate={onUpdate}
                onClose={() => setShowStrokePanel(false)}
            />
         )}
      </div>

      {/* Stroke Width Input */}
      <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
         <span className="text-gray-400">
            <AlignJustify size={16} />
         </span> 
         <input 
            type="number" 
            value={strokeWidth}
            onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val > 0) {
                    onUpdate({ strokeWidth: val });
                }
            }}
            className="w-8 bg-transparent text-sm font-medium text-gray-700 outline-none text-center"
         />
         <span className="text-xs text-gray-400">px</span>
      </div>

      {/* Download (Optional) */}
      {onDownload && (
        <button 
            onClick={onDownload}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors ml-1"
            title="Download"
        >
            <Download size={18} />
        </button>
      )}
    </div>
  );
}

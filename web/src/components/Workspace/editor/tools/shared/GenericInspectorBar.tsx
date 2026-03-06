import React, { useState, useRef } from 'react';
import { Pencil, ArrowDownToLine, Scan } from 'lucide-react';
import { BaseElement } from '../../../types/BaseElement';
import { StrokePanel } from './StrokePanel';
import { CornerPanel } from './CornerPanel';

interface GenericInspectorBarProps {
  element: BaseElement<any>;
  onUpdate: (updates: Partial<any>) => void;
  onDownload?: () => void;
  
  // Configuration
  hasCornerPanel?: boolean;
  hasSides?: boolean;
  hasInnerRadius?: boolean;
  isDimensionReadOnly?: boolean;
  colorProp?: string;
  cornerIcon?: React.ReactNode;
}

export function GenericInspectorBar({ 
  element, 
  onUpdate, 
  onDownload,
  hasCornerPanel = false,
  hasSides = false,
  hasInnerRadius = false,
  isDimensionReadOnly = false,
  colorProp = 'color',
  cornerIcon
}: GenericInspectorBarProps) {
  const [showStrokePanel, setShowStrokePanel] = useState(false);
  const [showCornerPanel, setShowCornerPanel] = useState(false);
  const strokeButtonRef = useRef<HTMLButtonElement>(null);

  const el = element as any;
  const color = el.color || '#3b82f6';
  const stroke = el.stroke; 
  const width = Math.round(el.width);
  const height = Math.round(el.height);
  const strokeWidth = el.strokeWidth || 2;
  const cornerRadius = el.cornerRadius || 0;
  const sides = el.sides;
  const starInnerRadius = el.starInnerRadius;

  return (
    <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 whitespace-nowrap relative">
      {/* Fill Color */}
      <div className="relative group">
        <div 
            className="w-8 h-8 rounded-full border border-gray-200 cursor-pointer hover:scale-105 transition-transform shadow-sm"
            style={{ backgroundColor: color }}
            onClick={() => document.getElementById('fill-color-input')?.click()}
        />
        <input 
            id="fill-color-input"
            type="color" 
            value={color}
            onChange={(e) => onUpdate({ [colorProp]: e.target.value })}
            className="absolute opacity-0 w-0 h-0"
        />
      </div>

      {/* Stroke Color */}
      <div className="relative">
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
                onUpdate={onUpdate}
                onClose={() => setShowStrokePanel(false)}
            />
         )}
      </div>

      {/* Corner/Properties Panel */}
      {hasCornerPanel && (
          <div className="relative">
             <button 
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                onClick={() => setShowCornerPanel(!showCornerPanel)}
                title={hasSides ? "Properties" : "Corner Radius"}
             >
                <Scan size={18} />
             </button>
             
             {showCornerPanel && (
                <CornerPanel 
                    cornerRadius={cornerRadius}
                    sides={hasSides ? sides : undefined}
                    starInnerRadius={hasInnerRadius ? starInnerRadius : undefined}
                    onUpdate={onUpdate}
                    onClose={() => setShowCornerPanel(false)}
                />
             )}
          </div>
      )}

      <div className="w-px h-6 bg-gray-200 mx-1"></div>

      {/* Width */}
      <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
         <span className="text-xs text-gray-500 font-medium">W</span>
         {isDimensionReadOnly ? (
             <span className="text-sm text-gray-700 w-8">{width}</span>
         ) : (
             <input 
                type="number" 
                value={width}
                onChange={(e) => onUpdate({ width: parseInt(e.target.value) || 0 })}
                className="w-12 bg-transparent text-sm outline-none text-gray-700"
             />
         )}
      </div>

      <div className="text-gray-300 flex flex-col gap-0.5">
        <div className="w-0.5 h-0.5 bg-gray-300 rounded-full"></div>
        <div className="w-0.5 h-0.5 bg-gray-300 rounded-full"></div>
      </div>

      {/* Height */}
      <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
         <span className="text-xs text-gray-500 font-medium">H</span>
         {isDimensionReadOnly ? (
             <span className="text-sm text-gray-700 w-8">{height}</span>
         ) : (
             <input 
                type="number" 
                value={height}
                onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 0 })}
                className="w-12 bg-transparent text-sm outline-none text-gray-700"
             />
         )}
      </div>

      <div className="w-px h-6 bg-gray-200 mx-1"></div>

      {/* Download */}
      <button 
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
        onClick={onDownload}
        title="Export"
      >
        <ArrowDownToLine size={18} />
      </button>
    </div>
  );
}

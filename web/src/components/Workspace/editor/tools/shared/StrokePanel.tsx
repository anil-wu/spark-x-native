import React, { useState } from 'react';
import { X, AlignCenter, ChevronDown, Pipette } from 'lucide-react';
import { useI18n } from '@/i18n/client';

// Helper to get hex from color string (handles basic hex)
const getHex = (color: string) => {
  if (color.startsWith('#')) return color.substring(0, 7);
  return color;
}

interface StrokePanelProps {
  stroke: string | undefined;
  strokeWidth: number;
  onUpdate: (updates: any) => void;
  onClose: () => void;
}

export const StrokePanel = ({ 
  stroke, 
  strokeWidth, 
  onUpdate, 
  onClose 
}: StrokePanelProps) => {
  const { t } = useI18n();
  const [hex, setHex] = useState(stroke ? getHex(stroke) : '#000000');
  const [opacity, setOpacity] = useState(100);
  
  const presets = [
    { color: undefined, label: 'None' }, // Transparent/None
    { color: '#000000', label: 'Black' },
    { color: '#ffffff', label: 'White' },
    { color: '#22c55e', label: 'Green' },
    { color: '#a855f7', label: 'Purple' },
    { color: '#e879f9', label: 'Light Purple' },
  ];

  const handleHexChange = (val: string) => {
    setHex(val);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
       onUpdate({ stroke: val });
    }
  };

  return (
    <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 w-[280px] p-4 z-50">
      <div className="flex items-center justify-between mb-4">
        <span className="font-medium text-gray-700">{t('editor.stroke')}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-md px-2 h-8">
           <span className="mr-2 text-gray-400"><AlignCenter size={14} /></span>
           <input 
             type="number" 
             value={strokeWidth}
             onChange={(e) => onUpdate({ strokeWidth: parseInt(e.target.value) || 0 })}
             className="w-full bg-transparent outline-none text-sm"
           />
           <span className="text-xs text-gray-400 ml-1">px</span>
        </div>
        <div className="flex-1 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-2 h-8 cursor-pointer">
           <span className="text-sm text-gray-600">{t('editor.align_center')}</span>
           <ChevronDown size={14} className="text-gray-400" />
        </div>
      </div>

      {/* Color Picker Area */}
      <div className="mb-4">
        {/* Gradient Box Mockup */}
        <div 
           className="w-full h-32 rounded-lg mb-3 relative overflow-hidden cursor-pointer"
           style={{
             background: `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, ${hex})`,
             backgroundColor: hex
           }}
        >
        </div>

        {/* Sliders */}
        <div className="flex flex-col gap-2 mb-3">
           {/* Hue Slider */}
           <div className="h-3 rounded-full relative overflow-hidden">
             <input 
               type="range" 
               min="0" 
               max="360" 
               className="w-full h-full opacity-0 absolute z-10 cursor-pointer"
               onChange={(e) => {
                 // Simplified hue change logic - in real app we'd convert HSL to Hex
                 // For now, let's just use native picker for complex color selection if needed
               }}
             />
             <div className="w-full h-full" style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}></div>
           </div>
           
           {/* Opacity Slider */}
           <div className="h-3 rounded-full relative overflow-hidden bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')]">
             <input 
                type="range" 
                min="0" 
                max="100" 
                value={opacity} 
                onChange={(e) => setOpacity(parseInt(e.target.value))}
                className="w-full h-full opacity-0 absolute z-10 cursor-pointer" 
             />
             <div className="w-full h-full absolute top-0 left-0 pointer-events-none" style={{ background: `linear-gradient(to right, transparent, ${hex})` }}></div>
           </div>
        </div>

        {/* Presets */}
        <div className="flex items-center justify-between gap-2 mb-3">
           <button className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500">
             <Pipette size={16} />
           </button>
           <div className="flex gap-2">
             {presets.map((preset, i) => (
               <button 
                 key={i}
                 className={`w-6 h-6 rounded-full border border-gray-200 relative overflow-hidden ${!preset.color ? 'bg-white' : ''}`}
                 style={{ backgroundColor: preset.color || 'transparent' }}
                 onClick={() => {
                    if (preset.color) {
                        setHex(preset.color);
                        onUpdate({ stroke: preset.color, strokeWidth: strokeWidth || 2 });
                    } else {
                        onUpdate({ stroke: undefined });
                    }
                 }}
                 title={preset.label}
               >
                 {!preset.color && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-red-500 transform rotate-45"></div>
                    </div>
                 )}
               </button>
             ))}
           </div>
        </div>

        {/* Hex Input */}
        <div className="flex gap-2">
           <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-md px-2 h-8">
              <span className="text-gray-400 mr-2">#</span>
              <input 
                type="text" 
                value={hex.replace('#', '')}
                onChange={(e) => handleHexChange('#' + e.target.value)}
                className="w-full bg-transparent outline-none text-sm uppercase"
              />
           </div>
           <div className="w-16 flex items-center bg-gray-50 border border-gray-200 rounded-md px-2 h-8">
              <input 
                type="number" 
                value={opacity}
                onChange={(e) => setOpacity(parseInt(e.target.value))}
                className="w-full bg-transparent outline-none text-sm"
              />
              <span className="text-xs text-gray-400 ml-1">%</span>
           </div>
        </div>
      </div>
    </div>
  );
};

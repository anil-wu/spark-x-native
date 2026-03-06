import React from 'react';
import { X, Underline, Strikethrough, List, ListOrdered, ArrowRightToLine, AlignJustify } from 'lucide-react';

interface TextAdvancedPanelProps {
  element: any;
  onUpdate: (updates: any) => void;
  onClose: () => void;
}

export const TextAdvancedPanel = ({ element, onUpdate, onClose }: TextAdvancedPanelProps) => {
  const lineHeight = element.lineHeight || 1.2;
  const letterSpacing = element.letterSpacing || 0;
  const textDecoration = element.textDecoration || '';
  const textTransform = element.textTransform || '';

  const handleDecoration = (val: string) => {
     if (textDecoration === val) {
         onUpdate({ textDecoration: '' });
     } else {
         onUpdate({ textDecoration: val });
     }
  };

  const handleTransform = (val: string) => {
     if (textTransform === val) {
         onUpdate({ textTransform: '' });
     } else {
         onUpdate({ textTransform: val });
     }
  };

  return (
    <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 w-[280px] p-4 z-50">
      <div className="flex items-center justify-between mb-4">
        <span className="font-medium text-gray-700">Advanced</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      {/* Row 1: Line Height and Letter Spacing */}
      <div className="flex gap-2 mb-3">
         {/* Line Height */}
         <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-md px-2 h-9">
             <span className="text-gray-500 mr-2 text-sm">↕</span>
             <span className="text-xs text-gray-400 mr-1">Auto</span>
             <input 
               type="number" 
               step="0.1"
               value={lineHeight}
               onChange={(e) => onUpdate({ lineHeight: parseFloat(e.target.value) })}
               className="w-full bg-transparent outline-none text-sm text-right"
             />
         </div>
         {/* Letter Spacing */}
         <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-md px-2 h-9">
             <span className="text-gray-500 mr-2 text-sm">↔</span>
             <input 
               type="number" 
               value={letterSpacing}
               onChange={(e) => onUpdate({ letterSpacing: parseInt(e.target.value) })}
               className="w-full bg-transparent outline-none text-sm text-right"
             />
             <span className="text-xs text-gray-400 ml-1">%</span>
         </div>
      </div>

      {/* Row 2: Decoration */}
      <div className="flex gap-2 mb-3">
         <div className="flex bg-gray-50 border border-gray-200 rounded-lg p-1">
             <button 
                className={`p-1.5 rounded-md transition-colors ${textDecoration === 'line-through' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
                onClick={() => handleDecoration('line-through')}
                title="Strikethrough"
             >
                 <Strikethrough size={16} />
             </button>
             <button 
                className={`p-1.5 rounded-md transition-colors ${textDecoration === 'underline' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
                onClick={() => handleDecoration('underline')}
                title="Underline"
             >
                 <Underline size={16} />
             </button>
             <button 
                className={`p-1.5 rounded-md transition-colors ${textDecoration === 'overline' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
                onClick={() => handleDecoration('overline')}
                title="Overline"
             >
                 <span className="text-sm font-medium" style={{ textDecoration: 'overline' }}>S</span>
             </button>
         </div>

         <div className="flex bg-gray-50 border border-gray-200 rounded-lg p-1 ml-auto">
             {/* List/Bullet functionality is complex in Konva/Canvas, maybe insert bullet char? */}
             <button 
                 className="p-1.5 rounded-md text-gray-500 hover:text-black hover:bg-white hover:shadow-sm"
                 onClick={() => {
                    // Simple implementation: prepend bullet to lines? Or just a placeholder action
                    // For now, let's console log or implement a basic toggle if feasible
                    console.log('Toggle List');
                 }}
             >
                 <List size={16} />
             </button>
             <button className="p-1.5 rounded-md text-gray-500 hover:text-black hover:bg-white hover:shadow-sm">
                 <ListOrdered size={16} />
             </button>
         </div>
      </div>

      {/* Row 3: Transform & Indent */}
      <div className="flex gap-2">
         <div className="flex bg-gray-50 border border-gray-200 rounded-lg p-1">
             <button 
                className={`p-1.5 rounded-md transition-colors ${textTransform === '' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
                onClick={() => handleTransform('')}
                title="Normal Case"
             >
                 <span className="text-xs font-bold">Aa</span>
             </button>
             <button 
                 className={`p-1.5 rounded-md transition-colors ${textTransform === 'uppercase' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
                 onClick={() => handleTransform('uppercase')}
             >
                 <span className="text-xs font-bold">AA</span>
             </button>
             <button 
                 className={`p-1.5 rounded-md transition-colors ${textTransform === 'lowercase' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
                 onClick={() => handleTransform('lowercase')}
             >
                 <span className="text-xs font-bold">aa</span>
             </button>
         </div>

         <div className="flex bg-gray-50 border border-gray-200 rounded-lg p-1 ml-auto">
             <button className="p-1.5 rounded-md text-gray-500 hover:text-black hover:bg-white hover:shadow-sm">
                 <ArrowRightToLine size={16} />
             </button>
             <button className="p-1.5 rounded-md text-gray-500 hover:text-black hover:bg-white hover:shadow-sm">
                 <AlignJustify size={16} />
             </button>
         </div>
      </div>
    </div>
  );
};

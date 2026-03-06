import React from 'react';
import { BaseElement } from '../../../types/BaseElement';
import { GenericInspectorBar } from './GenericInspectorBar';
import { Spline } from 'lucide-react';

interface DrawSelectionToolbarProps {
  element: BaseElement<any>;
  onUpdate: (updates: Partial<any>) => void;
  onDownload?: () => void;
}

export default function DrawSelectionToolbar(props: DrawSelectionToolbarProps) {
  const { element, onUpdate } = props;
  const el = element as any;
  
  // Map tension to cornerRadius for the UI
  // Tension 0.5 (standard smooth) -> 50 in UI
  // UI 0-200 -> Tension 0-2
  const tension = el.tension || 0;
  const proxyCornerRadius = Math.round(tension * 100);
  
  const proxyElement = {
    ...el,
    cornerRadius: proxyCornerRadius
  };

  const handleUpdate = (updates: any) => {
    if (updates.cornerRadius !== undefined) {
      const newTension = updates.cornerRadius / 100;
      onUpdate({ tension: newTension });
    } else {
      onUpdate(updates);
    }
  };

  return (
    <GenericInspectorBar 
      {...props} 
      element={proxyElement}
      onUpdate={handleUpdate}
      colorProp="fill"
      hasCornerPanel={true}
      cornerIcon={<Spline size={18} />}
    />
  );
}

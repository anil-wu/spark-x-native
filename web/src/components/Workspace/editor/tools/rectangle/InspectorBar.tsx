"use client";

import React from 'react';
import { BaseElement } from '../../../types/BaseElement';
import { GenericInspectorBar } from '../shared/GenericInspectorBar';

interface RectangleInspectorBarProps {
  element: BaseElement<any>;
  onUpdate: (updates: Partial<any>) => void;
  onDownload?: () => void;
}

export default function RectangleInspectorBar(props: RectangleInspectorBarProps) {
  return (
    <GenericInspectorBar 
      {...props} 
      hasCornerPanel={true}
    />
  );
}

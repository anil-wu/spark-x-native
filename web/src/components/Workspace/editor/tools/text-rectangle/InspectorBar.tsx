"use client";

import React from 'react';
import { BaseElement } from '../../../types/BaseElement';
import { GenericInspectorBar } from '../shared/GenericInspectorBar';

interface TextRectangleInspectorBarProps {
  element: BaseElement<any>;
  onUpdate: (updates: Partial<any>) => void;
  onDownload?: () => void;
}

export default function TextRectangleInspectorBar(props: TextRectangleInspectorBarProps) {
  return (
    <GenericInspectorBar 
      {...props} 
      hasCornerPanel={true}
    />
  );
}

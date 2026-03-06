"use client";

import React from 'react';
import { BaseElement } from '../../../types/BaseElement';
import { GenericInspectorBar } from '../shared/GenericInspectorBar';

interface TextCircleInspectorBarProps {
  element: BaseElement<any>;
  onUpdate: (updates: Partial<any>) => void;
  onDownload?: () => void;
}

export default function TextCircleInspectorBar(props: TextCircleInspectorBarProps) {
  return (
    <GenericInspectorBar 
      {...props} 
      hasCornerPanel={false}
    />
  );
}

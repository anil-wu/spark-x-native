"use client";

import React from 'react';
import { BaseElement } from '../../../types/BaseElement';
import { GenericInspectorBar } from '../shared/GenericInspectorBar';

interface CircleInspectorBarProps {
  element: BaseElement<any>;
  onUpdate: (updates: Partial<any>) => void;
  onDownload?: () => void;
}

export default function CircleInspectorBar(props: CircleInspectorBarProps) {
  return (
    <GenericInspectorBar 
      {...props} 
      hasCornerPanel={false}
    />
  );
}

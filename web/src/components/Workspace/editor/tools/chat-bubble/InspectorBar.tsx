"use client";

import React from 'react';
import { BaseElement } from '../../../types/BaseElement';
import { GenericInspectorBar } from '../shared/GenericInspectorBar';

interface ChatBubbleInspectorBarProps {
  element: BaseElement<any>;
  onUpdate: (updates: Partial<any>) => void;
  onDownload?: () => void;
}

export default function ChatBubbleInspectorBar(props: ChatBubbleInspectorBarProps) {
  return (
    <GenericInspectorBar 
      {...props} 
      hasCornerPanel={true}
      isDimensionReadOnly={true}
    />
  );
}

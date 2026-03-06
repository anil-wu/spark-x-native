"use client";

import React from 'react';
import { ZoomIn, Scissors, Eraser, Edit, Move, PenTool, MoreHorizontal, Settings2 } from 'lucide-react';
import { useI18n } from '@/i18n/client';

export default function ImageInspectorBar() {
  const { t } = useI18n();
  const items = [
    { icon: <ZoomIn size={18} />, label: t("inspector.zoom_in") },
    { icon: <Scissors size={18} />, label: t("inspector.remove_bg") },
    { icon: <Eraser size={18} />, label: t("inspector.erase") },
    { icon: <Edit size={18} />, label: t("inspector.edit_element") },
    { icon: <Move size={18} />, label: t("inspector.adjust_pose") },
    { icon: <PenTool size={18} />, label: t("inspector.draw") },
    { icon: <MoreHorizontal size={18} />, label: "" },
    { icon: <Settings2 size={18} />, label: "" },
  ];

  return (
    <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg shadow-xl border border-gray-200 whitespace-nowrap">
      {items.map((item, index) => (
        <button 
          key={index}
          className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-gray-100 text-sm text-gray-700 transition-colors"
        >
          {item.icon}
          {item.label && <span>{item.label}</span>}
        </button>
      ))}
    </div>
  );
}

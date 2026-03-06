import React from 'react';
import { Combine, Download } from 'lucide-react';
import { useI18n } from '@/i18n/client';

interface MergeToolbarProps {
  x: number;
  y: number;
  onMerge: () => void;
  onDownload: () => void;
  selectedCount: number;
  disabled?: boolean;
}

export const MergeToolbar: React.FC<MergeToolbarProps> = ({
  x,
  y,
  onMerge,
  onDownload,
  selectedCount,
  disabled = false,
}) => {
  const { t } = useI18n();

  return (
    <div
      className="absolute z-50 flex items-center gap-2 bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -100%)', // 居中并定位在顶部
        marginTop: '-12px',
        pointerEvents: disabled ? 'none' : 'auto',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <button
        onClick={onMerge}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors"
        title={t('workspace.merge_selected')}
      >
        <Combine className="h-4 w-4" />
        {t('workspace.merge')} ({selectedCount})
      </button>
      
      <button
        onClick={onDownload}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 rounded-md text-sm font-medium transition-colors"
        title={t('workspace.download_preview')}
      >
        <Download className="h-4 w-4" />
        {t('workspace.download')}
      </button>
    </div>
  );
};

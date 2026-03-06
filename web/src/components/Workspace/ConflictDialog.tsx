"use client";

import React from 'react';
import { X, Download, RotateCcw, AlertTriangle, Save } from 'lucide-react';
import { useI18n } from '@/i18n/client';

interface ConflictData {
  remoteLayers: any[];
  localLayers: any[];
}

interface ConflictDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUseRemote: () => void;
  onForceSave: () => void;
  conflictData?: ConflictData;
}

export default function ConflictDialog({
  isOpen,
  onClose,
  onUseRemote,
  onForceSave,
  conflictData,
}: ConflictDialogProps) {
  const { t } = useI18n();

  if (!isOpen) return null;

  const handleDownloadBoth = () => {
    if (!conflictData) return;

    const remoteBlob = new Blob([JSON.stringify(conflictData.remoteLayers, null, 2)], {
      type: 'application/json',
    });
    const localBlob = new Blob([JSON.stringify(conflictData.localLayers, null, 2)], {
      type: 'application/json',
    });

    const remoteUrl = URL.createObjectURL(remoteBlob);
    const localUrl = URL.createObjectURL(localBlob);

    const remoteLink = document.createElement('a');
    remoteLink.href = remoteUrl;
    remoteLink.download = 'remote-version.json';
    remoteLink.click();

    const localLink = document.createElement('a');
    localLink.href = localUrl;
    localLink.download = 'local-version.json';
    localLink.click();

    URL.revokeObjectURL(remoteUrl);
    URL.revokeObjectURL(localUrl);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {t('workspace.conflict_detected')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            {t('workspace.conflict_description')}
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-yellow-800">
              {t('workspace.conflict_tip')}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={onUseRemote}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              <RotateCcw className="h-4 w-4" />
              {t('workspace.use_remote_version')}
            </button>

            <button
              onClick={onForceSave}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Save className="h-4 w-4" />
              {t('workspace.force_save')}
            </button>

            <button
              onClick={handleDownloadBoth}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              <Download className="h-4 w-4" />
              {t('workspace.download_both_versions')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
